// pages/admin/grading.js — AI grading for writing submissions.
//
// The browser drives the run one submission at a time. The Cerebras free tier
// allows roughly 5 requests a minute, so the delay between calls is the thing
// keeping us inside the quota; it is adjustable here rather than hardcoded.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/AdminShell';

const DEFAULT_DELAY_SECONDS = 13; // ~4.6 req/min, just under the 5/min free tier

export default function Grading() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [delay, setDelay] = useState(DEFAULT_DELAY_SECONDS);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const runningRef = useRef(false);
  const router = useRouter();

  const addLog = useCallback((entry) => {
    setLog(prev => [{ ...entry, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 200));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/grade-writing');
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return null;
      }
      if (!response.ok) throw new Error('Failed to load grading status');
      const data = await response.json();
      setStatus(data);
      setError('');
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionStorage.getItem('adminData')) {
      router.push('/login');
      return;
    }
    refresh();
    return () => { runningRef.current = false; };
  }, [router, refresh]);

  const stop = () => {
    runningRef.current = false;
    setRunning(false);
  };

  const start = async () => {
    runningRef.current = true;
    setRunning(true);
    setError('');

    const current = await refresh();
    const queue = (current?.next || []).map(entry => entry.rowNumber);
    if (queue.length === 0) {
      addLog({ kind: 'done', text: 'Nothing to grade.' });
      stop();
      return;
    }

    let needsReview = 0;

    // Walk the queue explicitly so a submission we cannot grade is stepped
    // over rather than being handed back as "next" on every iteration.
    for (let index = 0; index < queue.length; index++) {
      if (!runningRef.current) break;
      const rowNumber = queue[index];
      let retriedAfterRateLimit = false;

      while (runningRef.current) {
        let payload;
        let httpStatus;
        try {
          const response = await fetch('/api/grade-writing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowNumber }),
          });

          if (response.status === 401) {
            sessionStorage.removeItem('adminData');
            router.push('/login');
            return;
          }

          httpStatus = response.status;
          payload = await response.json().catch(() => ({}));
        } catch (err) {
          addLog({ kind: 'error', text: err.message });
          setError(err.message);
          stop();
          return;
        }

        if (httpStatus === 429) {
          const wait = payload.retryAfter || delay * 2;
          addLog({ kind: 'warn', text: `Rate limited. Waiting ${wait}s` });
          await sleep(wait * 1000);
          retriedAfterRateLimit = true;
          continue; // same row again
        }

        // Per-submission problems: empty script, or no readable mark. The row
        // stays ungraded on purpose — we never guess a score — so note it and
        // carry on with the rest.
        if (httpStatus === 422) {
          needsReview++;
          addLog({ kind: 'warn', text: payload.message || 'Needs manual review' });
          break;
        }

        if (httpStatus >= 400) {
          addLog({ kind: 'error', text: payload.message || `Request failed (${httpStatus})` });
          setError(payload.message || `Request failed (${httpStatus})`);
          stop();
          return;
        }

        if (payload.skipped) {
          addLog({ kind: 'warn', text: payload.message });
        } else if (payload.graded) {
          addLog({
            kind: 'ok',
            text: `${payload.graded.student_id}  ${payload.graded.score}/50 (${payload.graded.wordCount} words)`,
          });
        }

        setStatus(prev => (prev
          ? { ...prev, pending: Math.max(0, prev.pending - 1), graded: prev.graded + 1 }
          : prev));
        break;
      }

      if (runningRef.current && index < queue.length - 1) {
        await sleep(delay * 1000);
      }
      void retriedAfterRateLimit;
    }

    addLog({
      kind: 'done',
      text: needsReview > 0
        ? `Run finished. ${needsReview} submission(s) need manual review.`
        : 'Run finished. All submissions graded.',
    });
    stop();
    await refresh();
  };

  const pending = status?.pending ?? 0;
  const graded = status?.graded ?? 0;
  const total = status?.total ?? 0;
  const pct = total > 0 ? Math.round((graded / total) * 100) : 0;

  return (
    <AdminShell>
      <div className="max-w-[880px]">
        <div className="mb-8">
          <h1 className="font-grotesk font-bold text-[26px] text-ftm-ink">Marking</h1>
          <p className="font-inter text-[14px] text-ftm-mut mt-1 max-w-measure">
            Marks writing submissions out of 50 against the CEFR criteria, one at a time. Every mark
            is provisional until a person checks it.
          </p>
        </div>

        {error && (
          <div role="alert" className="border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 mb-6">
            <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">There is a problem</h2>
            <p className="font-inter text-[14px] text-ftm-ink">{error}</p>
          </div>
        )}

        {status && !status.apiKeyConfigured && (
          <div className="border-l-[6px] border-ftm-ochre bg-ftm-card px-5 py-4 mb-6">
            <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">Marking is switched off</h2>
            <p className="font-inter text-[14px] leading-relaxed text-ftm-ink">
              CEREBRAS_API is not set on this deployment. Add it in the Vercel project settings, then
              redeploy. Env vars are captured when a deployment is created, so adding one does not
              reach the deployment that is already live.
            </p>
          </div>
        )}

        {loading ? (
          <div aria-busy="true">
            <div className="ftm-skeleton h-8 w-24 mb-3" />
            <div className="ftm-skeleton h-3 w-64 mb-8" />
            <div className="ftm-skeleton h-11 w-56" />
          </div>
        ) : (
          <>
            <div className="border-t-2 border-ftm-line2 pt-5 mb-8">
              <div className="flex flex-wrap gap-y-4 mb-6">
                <div className="pr-10">
                  <div className={`font-grotesk font-bold text-[34px] tabular-nums leading-none ${pending ? 'text-ftm-ochre' : 'text-ftm-green'}`}>
                    {pending}
                  </div>
                  <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">Unmarked</div>
                </div>
                <div className="pr-10">
                  <div className="font-grotesk font-bold text-[34px] text-ftm-ink tabular-nums leading-none">{graded}</div>
                  <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">Marked</div>
                </div>
                <div className="pr-10">
                  <div className="font-grotesk font-bold text-[34px] text-ftm-ink tabular-nums leading-none">{total}</div>
                  <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">Submissions</div>
                </div>
                <div className="pr-10">
                  <div className="font-grotesk font-bold text-[34px] text-ftm-ink tabular-nums leading-none">{pct}%</div>
                  <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">Complete</div>
                </div>
              </div>

              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Marking progress"
                className="h-1.5 bg-ftm-up overflow-hidden mb-6"
              >
                <div className="h-full bg-ftm-green transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                {running ? (
                  <button
                    onClick={stop}
                    className="border border-ftm-line2 text-ftm-ink hover:bg-ftm-up font-inter font-bold text-[14px] px-5 py-2.5 transition-colors"
                  >
                    Stop the run
                  </button>
                ) : (
                  <button
                    onClick={start}
                    disabled={pending === 0 || !status?.apiKeyConfigured}
                    className="bg-ftm-crimson hover:bg-ftm-crimsondeep text-white font-inter font-bold text-[14px] px-5 py-2.5 disabled:opacity-40 disabled:hover:bg-ftm-crimson transition-colors"
                  >
                    {pending === 0 ? 'Nothing to mark' : `Mark ${pending} submission${pending === 1 ? '' : 's'}`}
                  </button>
                )}

                <label htmlFor="delay" className="font-inter text-[13px] text-ftm-mut flex items-center gap-2">
                  Wait
                  <input
                    id="delay"
                    type="number"
                    min="1"
                    max="120"
                    value={delay}
                    disabled={running}
                    onChange={(e) => setDelay(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-2 py-1.5 text-ftm-ink tabular-nums disabled:opacity-50 transition-colors"
                  />
                  seconds between calls
                </label>

                {running ? (
                  <span className="ftm-status font-semibold text-ftm-ochre ml-auto">
                    Running. Keep this tab open.
                  </span>
                ) : (
                  <button
                    onClick={refresh}
                    className="font-inter font-semibold text-[13px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 ml-auto transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>

              <p className="font-inter text-[13px] leading-relaxed text-ftm-mut mt-5 max-w-measure">
                The free Cerebras tier allows about five requests a minute, so{' '}
                <span className="tabular-nums font-semibold text-ftm-ink">{delay}</span>s between calls keeps
                the run inside it. Marking{' '}
                <span className="tabular-nums font-semibold text-ftm-ink">{pending}</span> will take roughly{' '}
                <span className="tabular-nums font-semibold text-ftm-ink">{Math.ceil((pending * delay) / 60)}</span> minutes.
                The run is resumable, so stopping loses nothing.
              </p>

              {status?.model && (
                <p className="font-inter text-[12px] text-ftm-dim mt-2">Model: {status.model}</p>
              )}
            </div>

            {log.length > 0 && (
              <>
                <h2 className="font-grotesk font-bold text-[17px] text-ftm-ink mb-3">Run log</h2>
                <table className="ftm-table">
                  <caption className="sr-only">Marking run log, newest last</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-20">Time</th>
                      <th scope="col">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((entry, index) => (
                      <tr key={index}>
                        <td className="text-ftm-dim tabular-nums align-top">{entry.at}</td>
                        <td
                          className={
                            entry.kind === 'warn' || entry.kind === 'error' ? 'text-ftm-ochre'
                              : entry.kind === 'done' ? 'text-ftm-green'
                              : 'text-ftm-ink'
                          }
                        >
                          {entry.text}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
