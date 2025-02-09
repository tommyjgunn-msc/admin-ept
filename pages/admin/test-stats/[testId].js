// pages/admin/test-stats/[testId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import StatsCard from '../../../components/TestStats/StatsCard';
import ProgressBar from '../../../components/TestStats/ProgressBar';

export default function TestStats() {
  const router = useRouter();
  const { testId } = router.query;
  const [stats, setStats] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    if (!testId) return;
    fetchTestAndStats();
  }, [testId]);

  const fetchTestAndStats = async () => {
    try {
      // Fetch test details
      const testResponse = await fetch(`/api/tests/${testId}`);
      if (!testResponse.ok) throw new Error('Failed to fetch test');
      const testData = await testResponse.json();
      setTest(testData);

      // Fetch test statistics
      const statsResponse = await fetch(`/api/test-stats/${testId}`);
      if (!statsResponse.ok) throw new Error('Failed to fetch statistics');
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterStats = (range) => {
    setTimeRange(range);
    // Will implement filtering in the API
    fetchTestAndStats(range);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!test || !stats) return <div>Test not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Test Date: {new Date(test.test_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-4">
            {/* Time range filters */}
            <select 
              value={timeRange}
              onChange={(e) => filterStats(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm"
            >
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
            <button
              onClick={() => router.push('/admin/tests')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Tests
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Total Submissions"
            value={stats.totalSubmissions}
          />
          <StatsCard 
            title="Average Score"
            value={`${stats.averageScore}%`}
          />
          <StatsCard 
            title="Completion Rate"
            value={`${stats.completionRate}%`}
          />
          <StatsCard 
            title="Time to Complete"
            value={stats.averageTime || "N/A"}
            subtitle="Average minutes"
          />
        </div>

        {/* Score Distribution */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Score Distribution</h3>
          <div className="space-y-4">
            {[
              { range: '90-100%', percentage: stats.scoreRanges?.['90-100'] || 0 },
              { range: '80-89%', percentage: stats.scoreRanges?.['80-89'] || 0 },
              { range: '70-79%', percentage: stats.scoreRanges?.['70-79'] || 0 },
              { range: '60-69%', percentage: stats.scoreRanges?.['60-69'] || 0 },
              { range: 'Below 60%', percentage: stats.scoreRanges?.['below-60'] || 0 },
            ].map((range) => (
              <ProgressBar
                key={range.range}
                label={range.range}
                percentage={range.percentage}
              />
            ))}
          </div>
        </div>

        {/* Question Analysis */}
        {test.type !== 'writing' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              Question Performance
            </h3>
            <div className="space-y-6">
              {stats.questionStats?.map((question, index) => (
                <div key={index} className="border-t pt-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Question {index + 1}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {question.text}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-indigo-600">
                        {question.correctPercentage}% correct
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {question.totalAttempts} attempts
                      </p>
                    </div>
                  </div>
                  <ProgressBar
                    percentage={question.correctPercentage}
                    label="Correct Responses"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}