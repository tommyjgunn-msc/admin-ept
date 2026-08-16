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
  // The asterisk marks a zero that came from an empty submission rather than
  // from marking, so it reads differently at a glance.
  return `${entry.score}/${entry.total}${entry.noResponse ? ' *' : ''}`;
}

function sectionTone(entry) {
  if (!entry) return 'text-ftm-dim';
  if (entry.state === 'review') return 'text-ftm-ochre';
  if (entry.state === 'ungraded') return 'text-ftm-dim';
  if (entry.noResponse) return 'text-ftm-ochre';
  return 'text-ftm-ink';
}

export default function Results() {
  const [dates, setDates] = useState([]);
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

  // Both routes build the PDF server-side; neither sends anything. Download
  // exists so the report can be distributed by hand while automated delivery
  // is unavailable.
  const buildPdf = async (dateIso, { download }) => {
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
      const url = URL.createObjectURL(await response.blob());
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `EPT-results-${dateIso}.pdf`;
        link.click();
        setNotice(`Downloaded EPT-results-${dateIso}.pdf`);
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDate(null);
    }
  };

  // Sitting summary. Was a row of tinted rounded chips in four colours; a
  // person scanning it had to decode a palette before reading a number. It is
  // now a ruled strip of figure-over-label pairs, which is the one arrangement
  // that lets you compare two sittings by eye.
  const Figure = ({ label, value, tone = 'text-ftm-ink' }) => (
    <div className="pr-8">
      <div className={`font-grotesk font-bold text-[21px] tabular-nums leading-none ${tone}`}>{value}</div>
      <div className="font-inter text-[11px] tracking-[.1em] uppercase text-ftm-dim mt-1.5">{label}</div>
    </div>
  );

  return (
    <AdminShell>
      <div className="max-w-shell">
        <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-grotesk font-bold text-[26px] text-ftm-ink">Results</h1>
            <p className="font-inter text-[14px] text-ftm-mut mt-1">Newest sitting first.</p>
          </div>
          <div>
            <label htmlFor="q" className="block font-inter font-semibold text-[12px] text-ftm-mut mb-1.5">
              Find a candidate
            </label>
            <input
              id="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or EPT ID"
              className="w-full sm:w-72 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3.5 py-2.5 font-inter text-[14px] transition-colors"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 mb-6 whitespace-pre-line">
            <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">There is a problem</h2>
            <p className="font-inter text-[14px] text-ftm-ink">{error}</p>
          </div>
        )}
        {notice && (
          <div role="status" className="border-l-[6px] border-ftm-green bg-ftm-card px-5 py-4 mb-6">
            <p className="font-inter text-[14px] text-ftm-ink">{notice}</p>
          </div>
        )}

        {loading ? (
          <div aria-busy="true">
            <div className="ftm-skeleton h-6 w-56 mb-6" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-6 py-3 border-b border-ftm-line">
                <div className="ftm-skeleton h-4 flex-[2]" />
                <div className="ftm-skeleton h-4 flex-1" />
                <div className="ftm-skeleton h-4 flex-1" />
                <div className="ftm-skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="border-t border-ftm-line2 pt-6 max-w-measure">
            <h2 className="font-grotesk font-bold text-[19px] text-ftm-ink mb-2">
              {query ? 'No candidate matches that' : 'No submissions yet'}
            </h2>
            <p className="font-inter text-[15px] leading-relaxed text-ftm-mut">
              {query
                ? <>Nothing matches &ldquo;{query}&rdquo;. Try part of a surname, or an EPT ID like EPT-2026-04471.</>
                : 'Results appear here once candidates start submitting sections.'}
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {visible.map((sitting) => {
              const isOpen = openDate === sitting.date_iso || Boolean(query);
              const s = sitting.summary;
              return (
                <section key={sitting.date_iso}>
                  <div className="border-t-2 border-ftm-line2 pt-5 mb-5">
                    <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
                      <button
                        onClick={() => setOpenDate(isOpen && !query ? null : sitting.date_iso)}
                        aria-expanded={isOpen}
                        className="font-grotesk font-bold text-[19px] text-ftm-ink hover:text-white text-left transition-colors"
                      >
                        {sitting.date_label}
                      </button>

                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => buildPdf(sitting.date_iso, { download: false })}
                          disabled={busyDate === sitting.date_iso}
                          className="font-inter font-semibold text-[13px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 disabled:opacity-50 transition-colors"
                        >
                          Preview the report
                        </button>
                        <button
                          onClick={() => buildPdf(sitting.date_iso, { download: true })}
                          disabled={busyDate === sitting.date_iso}
                          className="bg-ftm-crimson hover:bg-ftm-crimsondeep text-white font-inter font-bold text-[13px] px-4 py-2.5 disabled:opacity-50 transition-colors"
                        >
                          {busyDate === sitting.date_iso ? 'Building' : 'Download PDF'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-y-4 border-b border-ftm-line pb-5">
                      <Figure label="Candidates" value={sitting.students.length} />
                      {s.averagePercentage !== null && (
                        <Figure label="Average" value={`${s.averagePercentage}%`} />
                      )}
                      {s.needsReview > 0 && (
                        <Figure label="To review" value={s.needsReview} tone="text-ftm-ochre" />
                      )}
                      {s.noResponse > 0 && (
                        <Figure label="No response" value={s.noResponse} tone="text-ftm-ochre" />
                      )}
                      {s.flagged > 0 && (
                        <Figure label="Flagged" value={s.flagged} tone="text-ftm-ochre" />
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="ftm-table ftm-table-sticky min-w-[760px]">
                        <caption className="sr-only">Candidate marks for {sitting.date_label}</caption>
                        <thead>
                          <tr>
                            <th scope="col">Candidate</th>
                            <th scope="col">EPT ID</th>
                            {SECTIONS.map(sec => (
                              <th key={sec.key} scope="col" className="num">{sec.label}</th>
                            ))}
                            <th scope="col" className="num">Total</th>
                            <th scope="col" className="num">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sitting.students.map((student) => (
                            <tr key={student.student_id}>
                              <th scope="row" className="text-left align-top font-normal">
                                <span className="font-inter text-[13px] text-ftm-ink">
                                  {student.name || <span className="text-ftm-dim italic">no Auth record</span>}
                                </span>
                                {student.anyFlagged && (
                                  <span className="ftm-status font-semibold text-ftm-ochre ml-3">flagged</span>
                                )}
                                {student.hasNoResponse && (
                                  <span
                                    className="block font-inter text-[11px] text-ftm-ochre mt-1"
                                    title="Nothing came through for this section. Either the candidate submitted nothing, or they were moved to another machine to finish. Worth checking before the mark stands."
                                  >
                                    no response: {student.noResponseSections.join(', ')}
                                  </span>
                                )}
                              </th>
                              <td className="font-inter text-[12px] text-ftm-mut tabular-nums">{student.student_id}</td>
                              {SECTIONS.map(sec => (
                                <td key={sec.key} className={`num ${sectionTone(student.sections[sec.key])}`}>
                                  {sectionText(student.sections[sec.key])}
                                </td>
                              ))}
                              <td className="num text-ftm-mut">
                                {student.complete ? `${student.totalScore}/${student.totalPossible}` : '—'}
                              </td>
                              <td className="num font-semibold">
                                {student.complete && student.overallPercentage !== null
                                  ? `${student.overallPercentage}%` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="border-t border-ftm-line mt-12 pt-5 max-w-measure">
            <h2 className="font-inter font-bold text-[11px] tracking-[.14em] uppercase text-ftm-dim mb-3">
              Reading this table
            </h2>
            <dl className="ftm-facts">
              <div>
                <dt className="k"><span className="text-ftm-ochre font-semibold">*</span> after a score</dt>
                <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                  A zero from an empty submission. The candidate may have written nothing, or been
                  moved to another machine to finish, leaving this row behind. Check before the mark stands.
                </dd>
              </div>
              <div>
                <dt className="k">review</dt>
                <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                  The writing mark could not be read automatically.
                </dd>
              </div>
              <div>
                <dt className="k">ungraded</dt>
                <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                  The script has not been marked yet.
                </dd>
              </div>
              <div>
                <dt className="k">Blank total</dt>
                <dd className="v text-left max-w-[440px] font-normal text-ftm-mut">
                  Totals appear only once all three sections carry a mark.
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
