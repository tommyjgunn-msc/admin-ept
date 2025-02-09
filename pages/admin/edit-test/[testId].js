// pages/admin/edit-test/[testId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PreviewModal from '../../../components/PreviewModal';
import WritingTestEditor from '../../../components/WritingTestEditor';
import QuestionTestEditor from '../../../components/QuestionTestEditor';

const formatContentForAPI = (sections) => {
  if (!Array.isArray(sections)) return [];
  
  return sections.flatMap((section, sIndex) => {
    if (!section.questions) return [];
    
    return section.questions.map((question, qIndex) => [
      null,
      (sIndex + 1).toString(),
      section.title || '',
      section.content || '',
      (qIndex + 1).toString(),
      question.text || '',
      JSON.stringify(question.options || []),
      question.correctAnswer || '',
      (question.points || 1).toString()
    ]);
  });
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
      setTest(data);
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
      // Format the content properly before sending
      const formattedTest = {
        ...test,
        content: formatContentForAPI(test.content)
      };
  
      console.log('Sending formatted test:', formattedTest); // Debug log
  
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedTest),
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
      <p className="text-red-600">Error: {error}</p>
    </div>
  );

  if (!test) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Test not found</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Edit {test.type.charAt(0).toUpperCase() + test.type.slice(1)} Test</h1>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200"
              >
                Preview Test
              </button>
              <button
                onClick={() => router.push('/admin/tests')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Tests
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={test.title}
                  onChange={(e) => updateMetadata('title', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Test Date
                </label>
                <input
                  type="date"
                  value={test.test_date}
                  onChange={(e) => updateMetadata('test_date', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={test.description || ''}
                  onChange={(e) => updateMetadata('description', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${
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
        test={test} // Your test metadata
        content={test.type === 'writing' ? // Format content based on type
          [test.content] : // For writing tests, wrap single prompt in array
          test.content    // For reading/listening tests, pass sections array
        }
      >
        <div className="space-y-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">{test.title}</h2>
            {test.description && (
              <p className="text-gray-600 mb-6">{test.description}</p>
            )}
            
            {test.type === 'writing' ? (
              // Writing Test Preview
              <div className="space-y-8">
                {test.content.map((prompt, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-500 uppercase">
                        {prompt[2]} Essay
                      </span>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-lg">{prompt[3]}</p>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      Word limit: {prompt[4]} words
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Reading/Listening Test Preview
              <div className="space-y-12">
                {test.content.reduce((sections, [
                  _, sectionIndex, title, content, questionIndex, questionText, optionsJson, correctAnswer
                ]) => {
                  const idx = parseInt(sectionIndex) - 1;
                  if (!sections[idx]) {
                    sections[idx] = {
                      title,
                      content,
                      questions: []
                    };
                  }
                  sections[idx].questions[parseInt(questionIndex) - 1] = {
                    text: questionText,
                    options: JSON.parse(optionsJson),
                    correctAnswer
                  };
                  return sections;
                }, []).map((section, sectionIndex) => (
                  <div key={sectionIndex} className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-xl font-medium mb-4">{section.title}</h3>
                      {test.type === 'reading' && (
                        <div className="prose max-w-none mb-8">
                          {section.content}
                        </div>
                      )}
                      <div className="space-y-6">
                        {section.questions.map((question, questionIndex) => (
                          <div key={questionIndex} className="border rounded-lg p-4">
                            <p className="font-medium mb-3">
                              {questionIndex + 1}. {question.text}
                            </p>
                            <div className="space-y-2 ml-4">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`preview-${sectionIndex}-${questionIndex}`}
                                    disabled
                                  />
                                  <label>{option}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PreviewModal>
    </div>
  );
}
