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

  // Signal labels. These used to be tinted rounded chips in four colours,
  // which meant a page about evidence read as a page about colour. They are
  // now plain text with a square swatch where a signal is actually amber —
  // and nothing here is red, because none of these findings is a conclusion.
  const signal = (tone) =>
    `font-inter text-[12px] ${
      tone === 'amber' ? 'ftm-status font-semibold text-ftm-ochre'
      : tone === 'green' ? 'ftm-status text-ftm-green'
      : 'text-ftm-mut'
    }`;

  return (
    <AdminShell>
      <div className="max-w-shell">
        <div className="mb-8">
          <h1 className="font-grotesk font-bold text-[26px] text-ftm-ink">Proctoring</h1>
          <p className="font-inter text-[14px] text-ftm-mut mt-1 max-w-measure">
            {report?.date
              ? <>Most recent sitting: <span className="text-ftm-ink font-semibold">{toDisplayDate(report.date)}</span>. Earlier sittings remain in the sheet.</>
              : 'Signals collected during the most recent sitting.'}
          </p>
        </div>

        {/* Stated once, at the top, where it changes how the page is read —
            rather than as a footnote under 200 rows of findings. */}
        <div className="border-l-[6px] border-ftm-ochre pl-4 py-1 mb-10 max-w-measure">
          <p className="font-inter text-[14px] leading-relaxed text-ftm-mut">
            Everything below is a prompt to ask a candidate a question. None of it is proof of
            anything on its own.
          </p>
        </div>

        {error && (
          <div role="alert" className="border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 mb-6">
            <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">There is a problem</h2>
            <p className="font-inter text-[14px] text-ftm-ink">{error}</p>
          </div>
        )}

        {loading ? (
          <div aria-busy="true">
            <div className="ftm-skeleton h-6 w-48 mb-6" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="py-4 border-b border-ftm-line">
                <div className="ftm-skeleton h-4 w-40 mb-2" />
                <div className="ftm-skeleton h-3 w-72" />
              </div>
            ))}
          </div>
        ) : !summary ? (
          <div className="border-t border-ftm-line2 pt-6 max-w-measure">
            <h2 className="font-grotesk font-bold text-[19px] text-ftm-ink mb-2">Nothing recorded yet</h2>
            <p className="font-inter text-[15px] leading-relaxed text-ftm-mut">
              Proctoring signals appear here after the first sitting where a candidate submits a
              section.
            </p>
          </div>
        ) : (
          <>
            {/* Headline figures, as a ruled strip. Was four bordered cards. */}
            <div className="flex flex-wrap gap-y-4 border-t-2 border-ftm-line2 pt-5 pb-5 border-b border-ftm-line mb-10">
              {[
                { label: 'Candidates', value: summary.students, tone: 'text-ftm-ink' },
                { label: 'Submissions', value: summary.total, tone: 'text-ftm-ink' },
                { label: 'Flagged', value: summary.flagged, tone: summary.flagged ? 'text-ftm-ochre' : 'text-ftm-green' },
                { label: 'Forced submits', value: summary.forcedSubmits, tone: summary.forcedSubmits ? 'text-ftm-ochre' : 'text-ftm-ink' },
                {
                  label: 'Events',
                  value: summary.totals.fullscreen + summary.totals.windowFocus + summary.totals.copyPaste,
                  tone: 'text-ftm-ink',
                },
              ].map(({ label, value, tone }) => (
                <div key={label} className="pr-10">
                  <div className={`font-grotesk font-bold text-[26px] tabular-nums leading-none ${tone}`}>{value}</div>
                  <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Event breakdown. The bars were scaled to the largest category,
                so a category with 3 events and one with 4 looked nearly equal
                — the bar carried less information than the number beside it.
                It is a plain ranked table now. */}
            <h2 className="font-grotesk font-bold text-[17px] text-ftm-ink mb-3">Events by kind</h2>
            <table className="ftm-table max-w-[420px] mb-12">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col" className="num">Count</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Fullscreen exits', summary.totals.fullscreen],
                  ['Tab switches', summary.totals.windowFocus],
                  ['Copy or paste attempts', summary.totals.copyPaste],
                  ['Second-screen guesses', summary.totals.multipleMonitors],
                ]
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => (
                    <tr key={label}>
                      <th scope="row" className="text-left font-normal text-ftm-mut">{label}</th>
                      <td className="num font-semibold">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Per-candidate. Flagged first, then by event count. */}
            <h2 className="font-grotesk font-bold text-[17px] text-ftm-ink mb-3">By candidate</h2>
            <div className="border-t-2 border-ftm-line2 mb-8">
              {students.map(({ studentId, sections, flagged }) => (
                <div key={studentId} className="py-4 border-b border-ftm-line">
                  <div className="flex items-baseline gap-4 mb-2">
                    <p className="font-inter font-semibold text-[14px] text-ftm-ink tabular-nums">{studentId}</p>
                    <span className={`ftm-status font-semibold ${flagged ? 'text-ftm-ochre' : 'text-ftm-green'}`}>
                      {flagged ? 'flagged' : 'clean'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sections.map(sub => (
                      <div key={sub.test_id} className="flex items-baseline gap-x-5 gap-y-1 flex-wrap">
                        <span className="font-inter text-[12px] font-semibold text-ftm-mut w-20 capitalize shrink-0">
                          {sub.section}
                        </span>
                        {!sub.hasData ? (
                          <span className="font-inter text-[12px] text-ftm-dim">no data recorded</span>
                        ) : sub.reasons.length === 0 ? (
                          <span className={signal('green')}>nothing recorded</span>
                        ) : (
                          sub.reasons.map(reason => (
                            <span key={reason} className={signal('amber')}>{reason}</span>
                          ))
                        )}
                        {sub.totalAwaySeconds > 0 && (
                          <span className={signal('amber')}>
                            away {formatSeconds(sub.totalAwaySeconds)}
                            {sub.longestAwaySeconds > 0 && `, longest ${formatSeconds(sub.longestAwaySeconds)}`}
                          </span>
                        )}
                        {sub.hasTyping && (
                          <span className={signal(sub.peakWpm >= 90 ? 'amber' : '')}>
                            {sub.typedWords} words
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

            <div className="border-t border-ftm-line pt-5 max-w-measure">
              <h2 className="font-inter font-bold text-[11px] tracking-[.14em] uppercase text-ftm-dim mb-3">
                How to read these signals
              </h2>
              <dl className="ftm-facts">
                <div>
                  <dt className="k">Second-screen guess</dt>
                  <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                    A screen-size heuristic. It misfires on large single monitors and on windows
                    that are not maximised.
                  </dd>
                </div>
                <div>
                  <dt className="k">Copy or paste</dt>
                  <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                    One attempt flags a submission. Tab switches flag from the second.
                  </dd>
                </div>
                <div>
                  <dt className="k">Typing pace</dt>
                  <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                    Exam typing in a second language usually sits around 15 to 40 wpm. A sustained
                    triple-digit peak suggests dictation or text drafted elsewhere. It does not
                    establish it.
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
