// pages/admin/edit-test/[testId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PreviewModal from '../../../components/PreviewModal';
import WritingTestEditor from '../../../components/WritingTestEditor';
import QuestionTestEditor from '../../../components/QuestionTestEditor';

// Convert the raw spreadsheet rows the API returns into the structured shape
// the editors and the PUT handler both expect. Done once, on load, so that
// test.content has a single consistent shape for the entire edit session
// (previously it flipped between rows and objects depending on what you edited,
// which caused saves to either 500 or silently wipe content).
const rowsToSections = (rows) =>
  (rows || []).reduce((acc, [
    _, sectionIndex, title, content, questionIndex, text, optionsJson, correctAnswer, points
  ]) => {
    const sIdx = parseInt(sectionIndex) - 1;
    if (Number.isNaN(sIdx) || sIdx < 0) return acc;
    if (!acc[sIdx]) {
      acc[sIdx] = { title: title || '', content: content || '', questions: [] };
    }
    let options = [];
    try {
      options = JSON.parse(optionsJson || '[]');
    } catch (error) {
      console.error('Error parsing options:', error);
    }
    acc[sIdx].questions[parseInt(questionIndex) - 1] = {
      text: text || '',
      options,
      correctAnswer: correctAnswer || '',
      points: parseInt(points) || 1
    };
    return acc;
  }, []);

const rowsToPrompts = (rows) =>
  (rows || []).map(([_, promptIndex, type, text, wordLimit]) => ({
    type: type || 'argumentative',
    text: text || '',
    wordLimit: parseInt(wordLimit) || 500
  }));

// PreviewModal consumes raw rows for reading/listening but structured prompts
// for writing. Bridge the (now structured) test.content back to that shape.
const formatContentForPreview = (test) => {
  if (!test || !Array.isArray(test.content)) return [];
  if (test.type === 'writing') return test.content;
  return test.content.flatMap((section, sIndex) =>
    (section?.questions || []).map((question, qIndex) => [
      null,
      (sIndex + 1).toString(),
      section.title || '',
      section.content || '',
      (qIndex + 1).toString(),
      question.text || '',
      JSON.stringify(question.options || []),
      question.correctAnswer || '',
      (question.points ?? 1).toString()
    ])
  );
};

export default function EditTest() {
  const router = useRouter();
  const { testId } = router.query;
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    if (!testId) return;
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await fetch(`/api/tests/${testId}`);
      if (!response.ok) throw new Error('Failed to fetch test');
      const data = await response.json();
      const content = data.type === 'writing'
        ? rowsToPrompts(data.content)
        : rowsToSections(data.content);
      setTest({ ...data, content });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // test.content is already in the structured shape the API expects
      // (sections with questions, or writing prompts), so send it as-is.
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update test');
      }
      
      router.push('/admin/tests');
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateMetadata = (field, value) => {
    setTest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to update test content based on type
  const updateContent = (newContent) => {
    setTest(prev => ({
      ...prev,
      content: Array.isArray(newContent) ? newContent : []
    }));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading test...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ftm-red">Error: {error}</p>
    </div>
  );

  if (!test) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Test not found</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-ftm-night py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-ftm-card shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Edit {test.type.charAt(0).toUpperCase() + test.type.slice(1)} Test</h1>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="bg-ftm-slate/[.14] text-ftm-slate px-4 py-2 rounded-md hover:bg-ftm-slate/[.2]"
              >
                Preview Test
              </button>
              <button
                onClick={() => router.push('/admin/tests')}
                className="text-ftm-mut hover:text-ftm-ink"
              >
                Back to Tests
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ftm-slate">
                  Title
                </label>
                <input
                  type="text"
                  value={test.title}
                  onChange={(e) => updateMetadata('title', e.target.value)}
                  className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ftm-slate">
                  Test Date
                </label>
                <input
                  type="date"
                  value={test.test_date}
                  onChange={(e) => updateMetadata('test_date', e.target.value)}
                  className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ftm-slate">
                  Description
                </label>
                <textarea
                  value={test.description || ''}
                  onChange={(e) => updateMetadata('description', e.target.value)}
                  className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
                  rows={3}
                />
              </div>
            </div>

            {/* Test Content Editor */}
            {test.type === 'writing' ? (
              <WritingTestEditor 
                content={test.content} 
                onChange={updateContent} 
              />
            ) : (
              <QuestionTestEditor 
                type={test.type}
                content={test.content} 
                onChange={updateContent}
              />
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/tests')}
                className="px-4 py-2 border border-white/[.16] rounded-md shadow-sm text-sm font-medium text-ftm-slate hover:bg-ftm-up"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ftm-red hover:bg-[#C51F35] ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/* Preview Modal */}
    <PreviewModal
        isOpen={showFullPreview}
        onClose={() => setShowFullPreview(false)}
        test={test}
        content={formatContentForPreview(test)}
    />
    </div>
  );
}
