// pages/admin/results.js — student results by sitting, with search and the
// per-sitting report generator.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/AdminShell';

const SECTIONS = [
  { key: 'reading', label: 'Reading' },
  { key: 'writing', label: 'Writing' },
  { key: 'listening', label: 'Listening' },
];

function sectionText(entry) {
  if (!entry) return '—';
  if (entry.state === 'review') return 'review';
  if (entry.state === 'ungraded') return 'ungraded';
  return `${entry.score}/${entry.total}`;
}

function sectionTone(entry) {
  if (!entry) return 'text-ftm-dim';
  if (entry.state === 'review') return 'text-ftm-amber';
  if (entry.state === 'ungraded') return 'text-ftm-dim';
  return 'text-ftm-ink';
}

export default function Results() {
  const [dates, setDates] = useState([]);
  const [mail, setMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [openDate, setOpenDate] = useState(null);
  const [busyDate, setBusyDate] = useState(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/results');
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Failed to load results');
      const data = await response.json();
      setDates(data.dates || []);
      setMail(data.mail || null);
      setOpenDate(prev => prev ?? data.dates?.[0]?.date_iso ?? null);
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

  // Search matches a student's name or EPT ID; a sitting with no match drops
  // out entirely rather than showing an empty section.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dates;
    return dates
      .map(d => ({
        ...d,
        students: d.students.filter(s =>
          s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
        ),
      }))
      .filter(d => d.students.length > 0);
  }, [dates, query]);

  const previewReport = async (dateIso) => {
    setBusyDate(dateIso);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/results/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_iso: dateIso, preview: true }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Could not build the report');
      }
      const blob = await response.blob();
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDate(null);
    }
  };

  const sendReport = async (sitting) => {
    const recipients = mail?.recipients || [];
    const confirmed = window.confirm(
      `Email the ${sitting.date_label} results report?\n\n` +
      `From: ${mail?.sender}\n` +
      `To:\n  ${recipients.join('\n  ')}\n\n` +
      `${sitting.summary.students} students. This sends immediately.`
    );
    if (!confirmed) return;

    setBusyDate(sitting.date_iso);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/results/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_iso: sitting.date_iso }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not send the report');
      setNotice(`${data.message}: ${data.recipients.join(', ')}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDate(null);
    }
  };

  const chip = (tone) =>
    `font-inter text-[11px] px-2 py-0.5 rounded ${
      tone === 'red' ? 'text-ftm-red bg-ftm-red/[.10]'
      : tone === 'amber' ? 'text-ftm-amber bg-ftm-amber/[.10]'
      : tone === 'green' ? 'text-ftm-green bg-ftm-green/[.10]'
      : 'text-ftm-dim bg-white/[.06]'
    }`;

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-grotesk text-xl text-ftm-ink">Results</h1>
            <p className="font-inter text-[13px] text-ftm-mut mt-1">
              Every sitting, newest first. Names come from the Auth sheet, matched on EPT ID.
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or EPT ID"
            className="w-full sm:w-72 border border-white/[.12] rounded px-3 py-2 font-inter text-[13px]"
          />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-red/40 bg-ftm-red/[.08] font-inter text-[13px] text-ftm-red whitespace-pre-line">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-green/40 bg-ftm-green/[.08] font-inter text-[13px] text-ftm-green">
            {notice}
          </div>
        )}
        {mail && !mail.configured && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-amber/40 bg-ftm-amber/[.08] font-inter text-[13px] text-ftm-amber">
            Email is not configured on this deployment — reports can be previewed but not sent.
          </div>
        )}

        {loading ? (
          <p className="font-inter text-[13px] text-ftm-dim">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="p-6 rounded-lg bg-ftm-bar border border-white/[.08] text-center">
            <p className="font-inter text-[13px] text-ftm-mut">
              {query ? `Nothing matches “${query}”.` : 'No submissions recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((sitting) => {
              const isOpen = openDate === sitting.date_iso || Boolean(query);
              const s = sitting.summary;
              return (
                <div key={sitting.date_iso} className="rounded-lg bg-ftm-bar border border-white/[.08] overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-white/[.06]">
                    <button
                      onClick={() => setOpenDate(isOpen && !query ? null : sitting.date_iso)}
                      className="font-inter text-[14px] text-ftm-ink hover:text-white text-left"
                    >
                      {sitting.date_label}
                    </button>
                    <span className={chip()}>
                      {sitting.students.length} student{sitting.students.length === 1 ? '' : 's'}
                    </span>
                    {s.averagePercentage !== null && (
                      <span className={chip('green')}>avg {s.averagePercentage}%</span>
                    )}
                    {s.needsReview > 0 && <span className={chip('amber')}>{s.needsReview} to review</span>}
                    {s.flagged > 0 && <span className={chip('red')}>{s.flagged} flagged</span>}

                    <div className="ml-auto flex items-center gap-3">
                      <button
                        onClick={() => previewReport(sitting.date_iso)}
                        disabled={busyDate === sitting.date_iso}
                        className="font-inter text-[12px] text-ftm-slate hover:text-ftm-ink disabled:opacity-50"
                      >
                        Preview PDF
                      </button>
                      <button
                        onClick={() => sendReport(sitting)}
                        disabled={busyDate === sitting.date_iso || !mail?.configured}
                        className="px-3 py-1.5 rounded bg-ftm-red text-white font-inter font-medium text-[12px] disabled:opacity-50"
                      >
                        {busyDate === sitting.date_iso ? 'Working…' : 'Generate & send report'}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px]">
                        <thead>
                          <tr className="font-inter text-[11px] uppercase tracking-wide text-ftm-dim">
                            <th className="text-left font-medium px-4 py-2">Student</th>
                            <th className="text-left font-medium px-3 py-2">EPT ID</th>
                            {SECTIONS.map(sec => (
                              <th key={sec.key} className="text-right font-medium px-3 py-2">{sec.label}</th>
                            ))}
                            <th className="text-right font-medium px-3 py-2">Total</th>
                            <th className="text-right font-medium px-4 py-2">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sitting.students.map((student) => (
                            <tr key={student.student_id} className="border-t border-white/[.05]">
                              <td className="px-4 py-2">
                                <span className="font-inter text-[13px] text-ftm-ink">
                                  {student.name || <span className="text-ftm-dim italic">no Auth record</span>}
                                </span>
                                {student.anyFlagged && (
                                  <span className={`${chip('red')} ml-2`}>flagged</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-inter text-[12px] text-ftm-mut">{student.student_id}</td>
                              {SECTIONS.map(sec => (
                                <td
                                  key={sec.key}
                                  className={`px-3 py-2 text-right font-inter text-[13px] ${sectionTone(student.sections[sec.key])}`}
                                >
                                  {sectionText(student.sections[sec.key])}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-inter text-[13px] text-ftm-slate">
                                {student.complete ? `${student.totalScore}/${student.totalPossible}` : '—'}
                              </td>
                              <td className="px-4 py-2 text-right font-inter text-[13px] font-medium text-ftm-ink">
                                {student.complete && student.overallPercentage !== null
                                  ? `${student.overallPercentage}%` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mail && (
          <p className="font-inter text-[11px] text-ftm-dim mt-4">
            Reports are sent from {mail.sender} to {mail.recipients.join(', ')}.
            “review” means the writing mark could not be read automatically; “ungraded” means the
            script has not been marked yet. Totals appear only once all three sections carry a mark.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
