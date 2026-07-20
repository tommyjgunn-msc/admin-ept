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

    while (runningRef.current) {
      let payload;
      try {
        const response = await fetch('/api/grade-writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (response.status === 401) {
          sessionStorage.removeItem('adminData');
          router.push('/login');
          return;
        }

        payload = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const wait = payload.retryAfter || delay * 2;
          addLog({ kind: 'warn', text: `Rate limited — waiting ${wait}s` });
          await sleep(wait * 1000);
          continue;
        }

        if (!response.ok) {
          // 422s are per-submission problems (empty script, unreadable mark).
          // Log and move on rather than stopping the whole run.
          if (response.status === 422) {
            addLog({ kind: 'warn', text: payload.message || 'Submission needs manual review' });
            // Nothing was written, so this row stays pending; stop to avoid
            // looping on it forever.
            addLog({ kind: 'warn', text: 'Stopped: this row would repeat. Grade it by hand, then resume.' });
            stop();
            break;
          }
          throw new Error(payload.message || `Request failed (${response.status})`);
        }
      } catch (err) {
        addLog({ kind: 'error', text: err.message });
        setError(err.message);
        stop();
        break;
      }

      if (payload.done) {
        addLog({ kind: 'done', text: 'All writing submissions are graded.' });
        stop();
        await refresh();
        break;
      }

      if (payload.skipped) {
        addLog({ kind: 'warn', text: payload.message });
      } else if (payload.graded) {
        addLog({
          kind: 'ok',
          text: `${payload.graded.student_id} — ${payload.graded.score}/50 (${payload.graded.wordCount} words)`,
        });
      }

      setStatus(prev => (prev ? { ...prev, pending: payload.remaining, graded: prev.total - payload.remaining } : prev));

      if (payload.remaining === 0) {
        addLog({ kind: 'done', text: 'All writing submissions are graded.' });
        stop();
        await refresh();
        break;
      }

      await sleep(delay * 1000);
    }
  };

  const pending = status?.pending ?? 0;
  const graded = status?.graded ?? 0;
  const total = status?.total ?? 0;
  const pct = total > 0 ? Math.round((graded / total) * 100) : 0;

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-grotesk text-xl text-ftm-ink">AI grading</h1>
          <p className="font-inter text-[13px] text-ftm-mut mt-1">
            Marks writing submissions out of 50 against the CEFR criteria, one at a time.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-red/40 bg-ftm-red/[.08] font-inter text-[13px] text-ftm-red">
            {error}
          </div>
        )}

        {status && !status.apiKeyConfigured && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-amber/40 bg-ftm-amber/[.08] font-inter text-[13px] text-ftm-amber">
            CEREBRAS_API is not set on this deployment. Add it in the Vercel project settings and redeploy.
          </div>
        )}

        {loading ? (
          <p className="font-inter text-[13px] text-ftm-dim">Loading…</p>
        ) : (
          <>
            <div className="p-4 rounded-lg bg-ftm-bar border border-white/[.08] mb-5">
              <div className="flex items-baseline gap-6 mb-3 flex-wrap">
                <p className="font-grotesk text-2xl text-ftm-ink">{pending}</p>
                <p className="font-inter text-[13px] text-ftm-mut">
                  ungraded of {total} writing submissions
                </p>
                <p className="font-inter text-[12px] text-ftm-dim ml-auto">
                  model: {status?.model}
                </p>
              </div>

              <div className="h-1.5 rounded-full bg-white/[.08] overflow-hidden mb-4">
                <div className="h-full bg-ftm-green transition-all" style={{ width: `${pct}%` }} />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {running ? (
                  <button
                    onClick={stop}
                    className="px-3.5 py-1.5 rounded border border-white/[.15] text-ftm-ink font-inter font-medium text-[13px]"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={start}
                    disabled={pending === 0 || !status?.apiKeyConfigured}
                    className="px-3.5 py-1.5 rounded bg-ftm-red text-white font-inter font-medium text-[13px] disabled:opacity-40"
                  >
                    {pending === 0 ? 'Nothing to grade' : `Grade ${pending} submission${pending === 1 ? '' : 's'}`}
                  </button>
                )}

                <label className="font-inter text-[12px] text-ftm-dim flex items-center gap-2">
                  Delay between calls
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={delay}
                    disabled={running}
                    onChange={(e) => setDelay(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 bg-ftm-night border border-white/[.12] rounded px-2 py-1 text-ftm-ink disabled:opacity-50"
                  />
                  s
                </label>

                {!running && (
                  <button onClick={refresh} className="font-inter text-[12px] text-ftm-dim hover:text-ftm-slate ml-auto">
                    Refresh
                  </button>
                )}
                {running && (
                  <span className="font-inter text-[12px] text-ftm-amber ml-auto">
                    Running — keep this tab open
                  </span>
                )}
              </div>

              <p className="font-inter text-[11px] text-ftm-dim mt-3">
                The free Cerebras tier allows about 5 requests a minute. {delay}s between calls keeps
                the run inside that. Grading {pending} will take roughly {Math.ceil((pending * delay) / 60)} min.
              </p>
            </div>

            {log.length > 0 && (
              <div className="rounded-lg bg-ftm-bar border border-white/[.08] overflow-hidden">
                {log.map((entry, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 border-b border-white/[.06] last:border-b-0 flex items-center gap-3"
                  >
                    <span className="font-inter text-[11px] text-ftm-dim w-16 shrink-0">{entry.at}</span>
                    <span
                      className={`font-inter text-[12px] ${
                        entry.kind === 'ok' ? 'text-ftm-ink'
                          : entry.kind === 'warn' ? 'text-ftm-amber'
                          : entry.kind === 'error' ? 'text-ftm-red'
                          : 'text-ftm-green'
                      }`}
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
              </div>
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
