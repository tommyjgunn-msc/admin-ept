// pages/api/proctoring-report.js — Aggregated proctoring report for the most
// recent sitting.
//
// ept-portal stores raw proctoring JSON per submission in Submissions!K. This
// endpoint finds the latest test date (from the YYYYMMDD suffix of test_id),
// parses every submission from that day and aggregates the signals so the
// admin UI can visualise one sitting. Older sittings stay in the sheet.
import { getGoogleSheets } from '../../utils/googleSheets';
import { withAdminAuth } from '../../utils/withAdminAuth';
import { RANGES } from '../../utils/sheetSchema';

// Mirrors the flag rule in ept-portal/pages/api/submit-test.js so the report
// can say WHY a row was flagged, not just that it was.
function flagReasons(warnings, proctoring) {
  const reasons = [];
  if ((warnings.fullscreen || 0) > 1) reasons.push(`left fullscreen ${warnings.fullscreen}×`);
  if ((warnings.windowFocus || 0) > 1) reasons.push(`left the tab ${warnings.windowFocus}×`);
  if ((warnings.copyPaste || 0) > 0) reasons.push(`copy/paste attempts: ${warnings.copyPaste}`);
  if (warnings.multipleMonitors) reasons.push('multiple monitors (heuristic)');
  if (proctoring?.shouldForceSubmit) reasons.push('auto-submitted after repeated violations');
  return reasons;
}

// Total and longest time out of the tab, from the blur/focus event timeline.
// Only complete blur→focus pairs are counted; a dangling blur (submitted while
// away) is ignored rather than guessed at.
function blurAnalysis(focusEvents) {
  const events = Array.isArray(focusEvents) ? focusEvents : [];
  let totalMs = 0;
  let longestMs = 0;
  let blurStart = null;

  for (const event of events) {
    const t = Date.parse(event.timestamp);
    if (Number.isNaN(t)) continue;
    if (event.type === 'blur') {
      blurStart = t;
    } else if (event.type === 'focus' && blurStart !== null) {
      const span = t - blurStart;
      if (span > 0 && span < 60 * 60 * 1000) { // ignore nonsense gaps > 1h
        totalMs += span;
        longestMs = Math.max(longestMs, span);
      }
      blurStart = null;
    }
  }

  return {
    totalAwaySeconds: Math.round(totalMs / 1000),
    longestAwaySeconds: Math.round(longestMs / 1000),
  };
}

// Words-per-minute peaks from the writing section's word-count growth curve
// ({t, w} samples taken at most every 15s). ESL exam typing sits around
// 15–40 wpm; a sustained triple-digit burst is the signature of dictation or
// externally drafted text arriving at once.
function typingAnalysis(typingSamples) {
  const samples = (Array.isArray(typingSamples) ? typingSamples : [])
    .map(s => ({ t: Date.parse(s.t), w: Number(s.w) }))
    .filter(s => !Number.isNaN(s.t) && Number.isFinite(s.w))
    .sort((a, b) => a.t - b.t);

  let peakWpm = 0;
  let peakBurst = null;
  for (let i = 1; i < samples.length; i++) {
    const seconds = (samples[i].t - samples[i - 1].t) / 1000;
    const words = samples[i].w - samples[i - 1].w;
    if (seconds >= 10 && words > 0) {
      const wpm = Math.round(words / (seconds / 60));
      if (wpm > peakWpm) {
        peakWpm = wpm;
        peakBurst = { words, seconds: Math.round(seconds) };
      }
    }
  }

  return {
    hasTyping: samples.length >= 2,
    typedWords: samples.length ? samples[samples.length - 1].w : 0,
    peakWpm,
    peakBurst,
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.SUBMISSIONS_PORTAL,
  });

  const rows = response.data.values || [];

  // Latest sitting = greatest YYYYMMDD suffix present in any test_id.
  const dated = rows
    .map((row, index) => {
      const match = String(row[0] || '').match(/_(\d{8})$/);
      return match ? { row, index, ymd: match[1] } : null;
    })
    .filter(Boolean);

  if (dated.length === 0) {
    return res.status(200).json({ date: null, submissions: [], summary: null });
  }

  const latest = dated.reduce((max, entry) => (entry.ymd > max ? entry.ymd : max), dated[0].ymd);
  const dateIso = `${latest.slice(0, 4)}-${latest.slice(4, 6)}-${latest.slice(6, 8)}`;

  const submissions = dated
    .filter(entry => entry.ymd === latest)
    .map(({ row }) => {
      let proctoring = null;
      try {
        proctoring = row[10] ? JSON.parse(row[10]) : null;
      } catch {
        proctoring = null;
      }

      const warnings = proctoring?.warnings || {};
      const reasons = proctoring ? flagReasons(warnings, proctoring) : [];

      return {
        test_id: row[0],
        student_id: row[1],
        section: row[6] || String(row[0]).split('_')[0],
        flagged: String(row[9] || '').toUpperCase() === 'YES',
        hasData: Boolean(proctoring),
        warnings: {
          fullscreen: warnings.fullscreen || 0,
          windowFocus: warnings.windowFocus || 0,
          copyPaste: warnings.copyPaste || 0,
          multipleMonitors: Boolean(warnings.multipleMonitors),
        },
        forcedSubmit: Boolean(proctoring?.shouldForceSubmit),
        reasons,
        ...blurAnalysis(proctoring?.focusEvents),
        ...typingAnalysis(proctoring?.typingSamples),
      };
    })
    // Flagged first, then by most warnings, so trouble sorts to the top.
    .sort((a, b) =>
      (b.flagged - a.flagged) ||
      ((b.warnings.fullscreen + b.warnings.windowFocus + b.warnings.copyPaste) -
       (a.warnings.fullscreen + a.warnings.windowFocus + a.warnings.copyPaste))
    );

  const summary = {
    total: submissions.length,
    students: new Set(submissions.map(s => s.student_id)).size,
    flagged: submissions.filter(s => s.flagged).length,
    forcedSubmits: submissions.filter(s => s.forcedSubmit).length,
    noData: submissions.filter(s => !s.hasData).length,
    totals: {
      fullscreen: submissions.reduce((n, s) => n + s.warnings.fullscreen, 0),
      windowFocus: submissions.reduce((n, s) => n + s.warnings.windowFocus, 0),
      copyPaste: submissions.reduce((n, s) => n + s.warnings.copyPaste, 0),
      multipleMonitors: submissions.filter(s => s.warnings.multipleMonitors).length,
    },
  };

  return res.status(200).json({ date: dateIso, submissions, summary });
}

export default withAdminAuth(handler);
