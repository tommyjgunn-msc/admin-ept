// pages/admin/proctoring.js — Proctoring report for the most recent sitting.
//
// Visualises the proctoring JSON that ept-portal writes to Submissions!K:
// summary cards for the day, then one row per submission with its signals.
// Only the latest test date is shown here; older sittings live in the sheet.
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/AdminShell';

function formatSeconds(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function toDisplayDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

const SECTION_ORDER = { reading: 0, writing: 1, listening: 2 };

export default function ProctoringReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/proctoring-report');
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Failed to load the proctoring report');
      setReport(await response.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionStorage.getItem('adminData')) {
      router.push('/login');
      return;
    }
    load();
  }, [router, load]);

  const summary = report?.summary;
  const submissions = report?.submissions || [];

  // Group rows by student so one person's three sections sit together.
  const byStudent = submissions.reduce((acc, sub) => {
    (acc[sub.student_id] = acc[sub.student_id] || []).push(sub);
    return acc;
  }, {});
  const students = Object.entries(byStudent)
    .map(([studentId, sections]) => ({
      studentId,
      sections: [...sections].sort(
        (a, b) => (SECTION_ORDER[a.section] ?? 9) - (SECTION_ORDER[b.section] ?? 9)
      ),
      flagged: sections.some(s => s.flagged),
      totalWarnings: sections.reduce(
        (n, s) => n + s.warnings.fullscreen + s.warnings.windowFocus + s.warnings.copyPaste, 0
      ),
    }))
    .sort((a, b) => (b.flagged - a.flagged) || (b.totalWarnings - a.totalWarnings));

  const card = 'p-4 rounded-lg bg-ftm-bar border border-white/[.08]';
  const chip = (tone) =>
    `font-inter text-[11px] px-2 py-0.5 rounded ${
      tone === 'red' ? 'text-ftm-red bg-ftm-red/[.10]'
      : tone === 'amber' ? 'text-ftm-amber bg-ftm-amber/[.10]'
      : tone === 'green' ? 'text-ftm-green bg-ftm-green/[.10]'
      : 'text-ftm-dim bg-white/[.06]'
    }`;

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-grotesk text-xl text-ftm-ink">Proctoring report</h1>
          <p className="font-inter text-[13px] text-ftm-mut mt-1">
            {report?.date
              ? <>Most recent sitting: <span className="text-ftm-slate">{toDisplayDate(report.date)}</span>. Earlier sittings remain in the sheet.</>
              : 'Signals collected during the most recent sitting.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-red/40 bg-ftm-red/[.08] font-inter text-[13px] text-ftm-red">
            {error}
          </div>
        )}

        {loading ? (
          <p className="font-inter text-[13px] text-ftm-dim">Loading…</p>
        ) : !summary ? (
          <div className={`${card} text-center`}>
            <p className="font-inter text-[13px] text-ftm-mut">No submissions with proctoring data yet.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className={card}>
                <p className="font-grotesk text-2xl text-ftm-ink">{summary.students}</p>
                <p className="font-inter text-[11px] uppercase tracking-wide text-ftm-dim mt-1">
                  students · {summary.total} submissions
                </p>
              </div>
              <div className={card}>
                <p className={`font-grotesk text-2xl ${summary.flagged ? 'text-ftm-red' : 'text-ftm-green'}`}>
                  {summary.flagged}
                </p>
                <p className="font-inter text-[11px] uppercase tracking-wide text-ftm-dim mt-1">
                  flagged submissions
                </p>
              </div>
              <div className={card}>
                <p className={`font-grotesk text-2xl ${summary.forcedSubmits ? 'text-ftm-amber' : 'text-ftm-ink'}`}>
                  {summary.forcedSubmits}
                </p>
                <p className="font-inter text-[11px] uppercase tracking-wide text-ftm-dim mt-1">
                  forced submissions
                </p>
              </div>
              <div className={card}>
                <p className="font-grotesk text-2xl text-ftm-ink">
                  {summary.totals.fullscreen + summary.totals.windowFocus + summary.totals.copyPaste}
                </p>
                <p className="font-inter text-[11px] uppercase tracking-wide text-ftm-dim mt-1">
                  total violations
                </p>
              </div>
            </div>

            {/* Violation breakdown bars */}
            <div className={`${card} mb-6`}>
              {[
                ['Fullscreen exits', summary.totals.fullscreen],
                ['Tab switches', summary.totals.windowFocus],
                ['Copy/paste attempts', summary.totals.copyPaste],
                ['Multi-monitor flags', summary.totals.multipleMonitors],
              ].map(([label, count]) => {
                const max = Math.max(
                  summary.totals.fullscreen, summary.totals.windowFocus,
                  summary.totals.copyPaste, summary.totals.multipleMonitors, 1
                );
                return (
                  <div key={label} className="flex items-center gap-3 py-1">
                    <span className="font-inter text-[12px] text-ftm-mut w-40 shrink-0">{label}</span>
                    <div className="flex-1 h-2 rounded bg-white/[.05] overflow-hidden">
                      <div
                        className="h-full rounded bg-ftm-red/70"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="font-inter text-[12px] text-ftm-slate w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Per-student rows */}
            <div className="rounded-lg bg-ftm-bar border border-white/[.08] overflow-hidden mb-4">
              {students.map(({ studentId, sections, flagged }) => (
                <div key={studentId} className="px-4 py-3 border-b border-white/[.06] last:border-b-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="font-inter text-[14px] text-ftm-ink">{studentId}</p>
                    <span className={chip(flagged ? 'red' : 'green')}>
                      {flagged ? 'flagged' : 'clean'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {sections.map(sub => (
                      <div key={sub.test_id} className="flex items-center gap-2 flex-wrap">
                        <span className="font-inter text-[12px] text-ftm-mut w-16 capitalize shrink-0">
                          {sub.section}
                        </span>
                        {!sub.hasData ? (
                          <span className={chip()}>no proctoring data</span>
                        ) : sub.reasons.length === 0 ? (
                          <span className={chip('green')}>no violations</span>
                        ) : (
                          sub.reasons.map(reason => (
                            <span key={reason} className={chip(reason.includes('heuristic') ? 'amber' : 'red')}>
                              {reason}
                            </span>
                          ))
                        )}
                        {sub.totalAwaySeconds > 0 && (
                          <span className={chip('amber')}>
                            away {formatSeconds(sub.totalAwaySeconds)}
                            {sub.longestAwaySeconds > 0 && ` (longest ${formatSeconds(sub.longestAwaySeconds)})`}
                          </span>
                        )}
                        {sub.hasTyping && (
                          <span className={chip(sub.peakWpm >= 150 ? 'red' : sub.peakWpm >= 90 ? 'amber' : '')}>
                            {sub.typedWords} words typed
                            {sub.peakWpm > 0 && `, peak ${sub.peakWpm} wpm`}
                            {sub.peakBurst && sub.peakWpm >= 90 &&
                              ` (${sub.peakBurst.words} words in ${sub.peakBurst.seconds}s)`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="font-inter text-[11px] text-ftm-dim">
              The multi-monitor signal is a screen-size heuristic and can misfire on large
              single monitors or non-maximised windows — treat it as a prompt to ask, not proof.
              A single copy/paste attempt flags a submission; tab switches flag from the second one.
              Typing pace: ESL exam typing usually sits around 15–40 wpm — a sustained
              triple-digit peak suggests dictation or externally drafted text, not proof of it.
            </p>
          </>
        )}
      </div>
    </AdminShell>
  );
}
