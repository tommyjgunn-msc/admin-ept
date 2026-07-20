// pages/admin/tests.js — Futurimi test management (dense grouped rows)
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
      if (!response.ok) throw new Error('Failed to fetch tests');
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
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete test');
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

    if (!window.confirm(`Are you sure you want to duplicate this test to today (${todayDate})?`)) return;

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
        throw new Error(data.message || 'Failed to duplicate test');
      }

      alert('Test duplicated successfully for today');
      fetchTests(); // Refresh the list
    } catch (error) {
      setError(error.message);
      alert(`Error duplicating test: ${error.message}`);
    } finally {
      setDuplicating(false);
    }
  };

  // Status chip styles (dark theme)
  const statusStyles = {
    upcoming: 'text-ftm-indigo bg-ftm-indigo/[.14]',
    active: 'text-ftm-green bg-ftm-green/[.14]',
    completed: 'text-ftm-dim2 bg-ftm-slate/[.14]'
  };

  if (loading) return (
    <AdminShell>
      <div className="flex items-center justify-center py-24">
        <p className="text-ftm-mut">Loading tests&hellip;</p>
      </div>
    </AdminShell>
  );

  if (error) return (
    <AdminShell>
      <div className="flex items-center justify-center py-24">
        <p className="text-ftm-red">Error: {error}</p>
      </div>
    </AdminShell>
  );

  return (
    <AdminShell>
      <div className="max-w-[1160px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-grotesk font-bold text-[19px] text-ftm-ink">Test management</h1>
          <button
            onClick={() => router.push('/admin/create-test')}
            className="font-inter font-semibold text-[12.5px] text-white bg-ftm-red hover:bg-[#C51F35] rounded-md px-4 py-[9px] transition-colors disabled:opacity-50"
            disabled={duplicating}
          >
            + Create new test
          </button>
        </div>

        {/* Test groups by date */}
        <div className="space-y-[18px]">
          {Object.entries(tests).map(([date, dateTests]) => {
            const groupStatus = dateTests.some(t => t.status === 'active')
              ? 'active'
              : dateTests.every(t => t.status === 'completed') ? 'completed' : 'upcoming';
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-inter font-semibold text-[11px] text-ftm-ink uppercase tracking-[.06em]">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} &middot; ALU Kigali
                  </span>
                  <span className={`font-inter font-semibold text-[10.5px] px-[7px] py-0.5 rounded-full ${statusStyles[groupStatus]}`}>
                    {groupStatus}
                  </span>
                </div>
                <div className="bg-ftm-card border border-white/[.08] rounded-lg overflow-hidden">
                  {dateTests.map((test, idx) => (
                    <div
                      key={test.test_id}
                      className={`flex flex-wrap items-center gap-y-2 px-4 py-[11px] ${idx < dateTests.length - 1 ? 'border-b border-white/[.06]' : ''}`}
                    >
                      <div className="flex-[2] min-w-[220px]">
                        <span className="font-inter font-semibold text-[13px] text-ftm-ink">{test.title}</span>
                        <span className="font-inter text-xs text-ftm-dim ml-2 capitalize">{test.type} test</span>
                      </div>
                      <div className="flex-1 font-inter text-[12.5px] text-ftm-dim2">{test.total_points} pts</div>
                      <div className="flex-1 font-inter text-[12.5px] text-ftm-dim2">
                        {test.status === 'completed' ? `${test.submissions_count || 0} submissions` : ''}
                      </div>
                      <div className="flex-none flex gap-3.5">
                        <button
                          onClick={() => duplicateTest(test.test_id)}
                          className="font-inter font-semibold text-xs text-ftm-slate hover:text-ftm-ink transition-colors disabled:opacity-50"
                          disabled={duplicating}
                        >
                          {duplicating ? 'Duplicating…' : 'Duplicate'}
                        </button>
                        <button
                          onClick={() => router.push(`/admin/edit-test/${test.test_id}`)}
                          className="font-inter font-semibold text-xs text-ftm-slate hover:text-ftm-ink transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/admin/test-stats/${test.test_id}`)}
                          className="font-inter font-semibold text-xs text-ftm-green hover:brightness-125 transition-all"
                        >
                          Stats
                        </button>
                        <button
                          onClick={() => deleteTest(test.test_id)}
                          className="font-inter font-semibold text-xs text-ftm-red hover:brightness-125 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(tests).length === 0 && (
            <div className="text-center py-12 bg-ftm-card border border-white/[.08] rounded-lg">
              <p className="text-ftm-dim">No tests created yet.</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
