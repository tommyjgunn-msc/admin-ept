// pages/admin/create-test

import { useState } from 'react';
import { useRouter } from 'next/router';

// Components for each test type
const ReadingTestForm = ({ onSubmit, isLoading }) => {
  // Add metadata state
  const [testMetadata, setTestMetadata] = useState({
    title: '',
    test_date: '',
    description: ''
  });

  // Your existing sections state
  const [sections, setSections] = useState([
    { title: '', content: '', questions: [{ text: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }] }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type: 'reading',
      testMetadata,  // Include metadata in submission
      sections
    });
  };

  // Your existing helper functions
  const addSection = () => {
    setSections([
      ...sections,
      { title: '', content: '', questions: [{ text: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }] }
    ]);
  };

  const addQuestion = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions.push({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1
    });
    setSections(newSections);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Add metadata section first */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium">Test Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Title</label>
            <input
              type="text"
              value={testMetadata.title}
              onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Date</label>
            <input
              type="date"
              value={testMetadata.test_date}
              onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              value={testMetadata.description}
              onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Your existing sections mapping */}
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Reading Section {sectionIndex + 1}</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Section Title</label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => {
                const newSections = [...sections];
                newSections[sectionIndex].title = e.target.value;
                setSections(newSections);
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reading Passage</label>
            <textarea
              value={section.content}
              onChange={(e) => {
                const newSections = [...sections];
                newSections[sectionIndex].content = e.target.value;
                setSections(newSections);
              }}
              rows={6}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div className="space-y-4">
            {section.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border border-gray-200 rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Question {questionIndex + 1}</h4>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Question text"
                    value={question.text}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[sectionIndex].questions[questionIndex].text = e.target.value;
                      setSections(newSections);
                    }}
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />

                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sectionIndex].questions[questionIndex].options[optionIndex] = e.target.value;
                          setSections(newSections);
                        }}
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                      />
                      <input
                        type="radio"
                        name={`correct-${sectionIndex}-${questionIndex}`}
                        checked={question.correctAnswer === option}
                        onChange={() => {
                          const newSections = [...sections];
                          newSections[sectionIndex].questions[questionIndex].correctAnswer = option;
                          setSections(newSections);
                        }}
                        required
                      />
                    </div>
                  ))}

                  <div className="flex items-center space-x-2">
                    <label className="text-sm">Points:</label>
                    <input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[sectionIndex].questions[questionIndex].points = parseInt(e.target.value);
                        setSections(newSections);
                      }}
                      className="w-20 border border-gray-300 rounded-md shadow-sm p-2"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => addQuestion(sectionIndex)}
              className="mt-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Question
            </button>
          </div>
        </div>
      ))}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={addSection}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add Section
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Creating...' : 'Create Test'}
        </button>
      </div>
    </form>
  );
};

const ListeningTestForm = ({ onSubmit, isLoading }) => {
  const [testMetadata, setTestMetadata] = useState({
    title: '',
    test_date: '',
    description: ''
  });  
  
  const [sections, setSections] = useState([
      { 
        title: 'First Recording',
        questions: [
          { text: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }
        ] 
      }
    ]);
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        type: 'listening',
        testMetadata,
        sections
      });
    };
  
    const addSection = () => {
      setSections([
        ...sections,
        { 
          title: `Recording ${sections.length + 1}`,
          questions: [
            { text: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }
          ] 
        }
      ]);
    };
  
    const addQuestion = (sectionIndex) => {
      const newSections = [...sections];
      newSections[sectionIndex].questions.push({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1
      });
      setSections(newSections);
    };
  
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Metadata Section */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Test Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Title</label>
              <input
                type="text"
                value={testMetadata.title}
                onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Date</label>
              <input
                type="date"
                value={testMetadata.test_date}
                onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                value={testMetadata.description}
                onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={3}
              />
            </div>
          </div>
        </div>
  
        {/* Questions Section */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium">{section.title}</h3>
            
            <div className="space-y-4">
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border border-gray-200 rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2">Question {questionIndex + 1}</h4>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Question text"
                      value={question.text}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[sectionIndex].questions[questionIndex].text = e.target.value;
                        setSections(newSections);
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required
                    />
  
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder={`Option ${optionIndex + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newSections = [...sections];
                            newSections[sectionIndex].questions[questionIndex].options[optionIndex] = e.target.value;
                            setSections(newSections);
                          }}
                          className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          required
                        />
                        <input
                          type="radio"
                          name={`correct-${sectionIndex}-${questionIndex}`}
                          checked={question.correctAnswer === option}
                          onChange={() => {
                            const newSections = [...sections];
                            newSections[sectionIndex].questions[questionIndex].correctAnswer = option;
                            setSections(newSections);
                          }}
                          required
                        />
                      </div>
                    ))}
  
                    <div className="flex items-center space-x-2">
                      <label className="text-sm">Points:</label>
                      <input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sectionIndex].questions[questionIndex].points = parseInt(e.target.value);
                          setSections(newSections);
                        }}
                        className="w-20 border border-gray-300 rounded-md shadow-sm p-2"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => addQuestion(sectionIndex)}
                className="mt-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Add Question
              </button>
            </div>
          </div>
        ))}
  
        <div className="flex justify-between">
          <button
            type="button"
            onClick={addSection}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add Recording Section
          </button>
  
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating...' : 'Create Test'}
          </button>
        </div>
      </form>
    );
};
  
const WritingTestForm = ({ onSubmit, isLoading }) => {
  const [testMetadata, setTestMetadata] = useState({
    title: '',
    test_date: '',
    description: ''
  });

  const [prompts, setPrompts] = useState([
      { type: 'argumentative', text: '', wordLimit: 500 }
    ]);
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        type: 'writing',
        testMetadata,
        sections: prompts
      });
    };
  
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Metadata Section */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Test Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Title</label>
              <input
                type="text"
                value={testMetadata.title}
                onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Date</label>
              <input
                type="date"
                value={testMetadata.test_date}
                onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                value={testMetadata.description}
                onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={3}
              />
            </div>
          </div>
        </div>
  
        {/* Writing Prompts Section */}
        {prompts.map((prompt, index) => (
          <div key={index} className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium">Writing Prompt {index + 1}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prompt Type</label>
                <select
                  value={prompt.type}
                  onChange={(e) => {
                    const newPrompts = [...prompts];
                    newPrompts[index].type = e.target.value;
                    setPrompts(newPrompts);
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  <option value="argumentative">Argumentative</option>
                  <option value="persuasive">Persuasive</option>
                  <option value="reflective">Reflective</option>
                </select>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700">Prompt Text</label>
                <textarea
                  value={prompt.text}
                  onChange={(e) => {
                    const newPrompts = [...prompts];
                    newPrompts[index].text = e.target.value;
                    setPrompts(newPrompts);
                  }}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700">Word Limit</label>
                <input
                  type="number"
                  value={prompt.wordLimit}
                  onChange={(e) => {
                    const newPrompts = [...prompts];
                    newPrompts[index].wordLimit = parseInt(e.target.value);
                    setPrompts(newPrompts);
                  }}
                  min="100"
                  className="mt-1 block w-32 border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
            </div>
          </div>
        ))}
  
        {/* Form buttons */}
        <div className="flex justify-between">
          {prompts.length < 3 && (
            <button
              type="button"
              onClick={() => setPrompts([...prompts, {
                type: 'argumentative',
                text: '',
                wordLimit: 500
              }])}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Prompt
            </button>
          )}
  
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating...' : 'Create Test'}
          </button>
        </div>
      </form>
    );
  };

export default function CreateTest() {
  const router = useRouter();
  const [testType, setTestType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTestSubmit = async (testData) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create test');
      }

      router.push('/admin/tests');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial step is test type selection
  if (!testType) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Test</h2>
            <p className="text-gray-600 mb-6">Select the type of test you want to create:</p>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {['Reading', 'Listening', 'Writing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTestType(type.toLowerCase())}
                  className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <span className="text-xl font-medium text-gray-900">{type}</span>
                  <span className="mt-2 text-sm text-gray-500">
                    {type === 'Reading' && '30 Questions'}
                    {type === 'Listening' && '20 Questions'}
                    {type === 'Writing' && '3 Prompts'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Create {testType.charAt(0).toUpperCase() + testType.slice(1)} Test</h2>
            <button
              onClick={() => setTestType('')}
              className="text-gray-600 hover:text-gray-900"
            >
              Change Type
            </button>
          </div>

          {testType === 'reading' && (
            <ReadingTestForm onSubmit={handleTestSubmit} isLoading={loading} />
          )}
          {testType === 'listening' && (
            <ListeningTestForm onSubmit={handleTestSubmit} isLoading={loading} />
          )}
          {testType === 'writing' && (
            <WritingTestForm onSubmit={handleTestSubmit} isLoading={loading} />
          )}
          
        </div>
      </div>
    </div>
  );
}