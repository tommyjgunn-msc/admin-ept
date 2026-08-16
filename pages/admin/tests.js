// pages/admin/tests.js — tests, grouped by sitting.
//
// The rows used to live inside a rounded, bordered card with no column headers,
// so "40" and "96" floated unlabelled and could not be compared down a column.
// It is now a real table per sitting: ruled rows, a sticky header, figures
// right-aligned and tabular. The four coloured action links became one link
// colour — a row where every action is a different colour teaches you to stop
// reading colour at all.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/AdminShell';

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check admin authentication
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login');
      return;
    }
    fetchTests();
  }, [router]);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/tests');
      // The API now requires a signed session cookie. A stale client-side
      // login (sessionStorage without a cookie) lands here — send them to
      // sign in again rather than showing a generic fetch failure.
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('The server did not return the test list.');
      const data = await response.json();

      // Group tests by date
      const groupedTests = data.reduce((acc, test) => {
        const date = new Date(test.test_date);
        const dateKey = date.toISOString().split('T')[0];

        // Calculate test status
        const today = new Date();
        let status = 'upcoming';
        if (date < today) {
          status = 'completed';
        } else if (date.toDateString() === today.toDateString()) {
          status = 'active';
        }

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push({ ...test, status });
        return acc;
      }, {});

      // Sort dates in ascending order
      const sortedTests = Object.fromEntries(
        Object.entries(groupedTests).sort(([a], [b]) => new Date(a) - new Date(b))
      );

      setTests(sortedTests);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTest = async (testId) => {
    if (!window.confirm('Delete this test? Submissions already made against it are not deleted, but the test will no longer be served.')) return;
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('The test could not be deleted.');
      fetchTests(); // Refresh the list
    } catch (error) {
      setError(error.message);
    }
  };

  const duplicateTest = async (testId) => {
    // Format today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    if (!window.confirm(`Copy this test to today (${todayDate})?`)) return;

    setDuplicating(true);
    try {
      const response = await fetch('/api/duplicate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceTestId: testId,
          newTestDate: todayDate
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'The test could not be copied.');
      }

      fetchTests(); // Refresh the list
    } catch (error) {
      setError(error.message);
    } finally {
      setDuplicating(false);
    }
  };

  // Status. Colour is never the only signal — .ftm-status prints a square
  // swatch before the word, and the word stands on its own.
  const statusStyles = {
    upcoming: 'text-ftm-slate',
    active: 'text-ftm-green',
    completed: 'text-ftm-dim',
  };

  if (loading) return (
    <AdminShell>
      <div className="max-w-[880px]" aria-busy="true">
        <div className="ftm-skeleton h-7 w-52 mb-8" />
        <div className="ftm-skeleton h-3 w-64 mb-3" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-6 py-3.5 border-b border-ftm-line">
            <div className="ftm-skeleton h-4 flex-[2]" />
            <div className="ftm-skeleton h-4 flex-1" />
            <div className="ftm-skeleton h-4 flex-1" />
          </div>
        ))}
      </div>
    </AdminShell>
  );

  if (error) return (
    <AdminShell>
      <div className="max-w-measure border-l-[6px] border-ftm-crimson pl-6 py-2" role="alert">
        <h1 className="font-grotesk font-bold text-[21px] text-ftm-ink mb-2">Could not load the tests</h1>
        <p className="font-inter text-[16px] leading-relaxed text-ftm-mut mb-6">{error}</p>
        <button
          onClick={() => { setError(''); setLoading(true); fetchTests(); }}
          className="font-inter font-bold text-[15px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep px-6 py-3 transition-colors"
        >
          Try again
        </button>
      </div>
    </AdminShell>
  );

  return (
    <AdminShell>
      <div className="max-w-[880px]">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
          <div>
            <h1 className="font-grotesk font-bold text-[26px] text-ftm-ink">Tests</h1>
            <p className="font-inter text-[14px] text-ftm-mut mt-1">
              Grouped by sitting, oldest first.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/create-test')}
            className="font-inter font-bold text-[14px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep px-5 py-2.5 transition-colors disabled:opacity-50"
            disabled={duplicating}
          >
            Create a test
          </button>
        </div>

        <div className="space-y-12">
          {Object.entries(tests).map(([date, dateTests]) => {
            const groupStatus = dateTests.some(t => t.status === 'active')
              ? 'active'
              : dateTests.every(t => t.status === 'completed') ? 'completed' : 'upcoming';
            return (
              <section key={date}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
                  <h2 className="font-grotesk font-bold text-[17px] text-ftm-ink">
                    {new Date(date).toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </h2>
                  <span className={`ftm-status font-semibold ${statusStyles[groupStatus]}`}>
                    {groupStatus}
                  </span>
                  <span className="font-inter text-[13px] text-ftm-dim">ALU Kigali</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="ftm-table min-w-[640px]">
                    <caption className="sr-only">Tests authored for this sitting</caption>
                    <thead>
                      <tr>
                        <th scope="col">Test</th>
                        <th scope="col" className="num">Points</th>
                        <th scope="col" className="num">Submissions</th>
                        <th scope="col" className="end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateTests.map((test) => (
                        <tr key={test.test_id}>
                          <th scope="row" className="text-left py-2.5 pr-4 border-b border-ftm-line align-top font-semibold text-ftm-ink">
                            {test.title}
                          </th>
                          <td className="num">{test.total_points}</td>
                          <td className="num">
                            {test.submissions_count > 0
                              ? test.submissions_count
                              : <span className="text-ftm-dim">{test.status === 'completed' ? '0' : '—'}</span>}
                          </td>
                          <td className="py-2.5 border-b border-ftm-line align-top text-right whitespace-nowrap">
                            <span className="inline-flex gap-4">
                              <button
                                onClick={() => router.push(`/admin/edit-test/${test.test_id}`)}
                                className="font-inter font-semibold text-[12px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => router.push(`/admin/test-stats/${test.test_id}`)}
                                className="font-inter font-semibold text-[12px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
                              >
                                Stats
                              </button>
                              <button
                                onClick={() => duplicateTest(test.test_id)}
                                className="font-inter font-semibold text-[12px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors disabled:opacity-50"
                                disabled={duplicating}
                              >
                                {duplicating ? 'Copying' : 'Duplicate'}
                              </button>
                              {/* Delete is not permanently red. The confirm
                                  dialog carries the weight; a row of four
                                  coloured links carries none. */}
                              <button
                                onClick={() => deleteTest(test.test_id)}
                                className="font-inter font-semibold text-[12px] text-ftm-dim hover:text-ftm-ochre underline underline-offset-4 transition-colors"
                              >
                                Delete
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {Object.keys(tests).length === 0 && (
            <div className="border-t border-ftm-line2 pt-6 max-w-measure">
              <h2 className="font-grotesk font-bold text-[19px] text-ftm-ink mb-2">No tests yet</h2>
              <p className="font-inter text-[15px] leading-relaxed text-ftm-mut mb-6">
                Create a reading, writing or listening test and assign it to a sitting. Candidates
                only see a section once a test exists for their date.
              </p>
              <button
                onClick={() => router.push('/admin/create-test')}
                className="font-inter font-bold text-[15px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep px-6 py-3 transition-colors"
              >
                Create the first test
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
