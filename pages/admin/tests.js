// pages/admin/tests.js with Duplicate functionality
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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

   // Status badge styles
   const statusStyles = {
    upcoming: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800'
  };


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading tests...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-600">Error: {error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Test Management</h1>
          <button
            onClick={() => router.push('/admin/create-test')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            disabled={duplicating}
          >
            Create New Test
          </button>
        </div>
  
        {/* Test List */}
        <div className="space-y-8">
          {Object.entries(tests).map(([date, dateTests]) => (
            <div key={date} className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Tests for {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {dateTests.map((test) => (
                <li key={test.test_id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-lg font-medium text-indigo-600">{test.title}</h4>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[test.status]}`}>
                          {test.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="capitalize">{test.type} Test</span>
                        <span className="mx-2">•</span>
                        <span>{test.total_points} points</span>
                        {test.status === 'completed' && (
                          <>
                            <span className="mx-2">•</span>
                            <span>
                              {test.submissions_count || 0} submissions
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => duplicateTest(test.test_id)}
                        className="text-purple-600 hover:text-purple-900"
                        disabled={duplicating}
                      >
                        {duplicating ? 'Duplicating...' : 'Duplicate'}
                      </button>
                      <button
                        onClick={() => router.push(`/admin/edit-test/${test.test_id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => router.push(`/admin/test-stats/${test.test_id}`)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Stats
                      </button>
                      <button
                        onClick={() => deleteTest(test.test_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {Object.keys(tests).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tests created yet.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
