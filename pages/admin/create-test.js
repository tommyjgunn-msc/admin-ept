// pages/admin/create-test

import { useState } from 'react';
import { useRouter } from 'next/router';
import WritingTestEditor from '../../components/WritingTestEditor';

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
      <div className="border-t-2 border-ftm-line2 pt-6 space-y-5">
        <h3 className="text-lg font-medium">Test Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Title</label>
            <input
              type="text"
              value={testMetadata.title}
              onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
              className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Date</label>
            <input
              type="date"
              value={testMetadata.test_date}
              onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
              className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
              required
            />
          </div>

          <div>
            <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Description (Optional)</label>
            <textarea
              value={testMetadata.description}
              onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
              className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Your existing sections mapping */}
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="border-t-2 border-ftm-line2 pt-6 space-y-5">
          <h3 className="text-lg font-medium">Reading Section {sectionIndex + 1}</h3>
          
          <div>
            <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Section Title</label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => {
                const newSections = [...sections];
                newSections[sectionIndex].title = e.target.value;
                setSections(newSections);
              }}
              className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
              required
            />
          </div>

          <div>
            <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Reading Passage</label>
            <textarea
              value={section.content}
              onChange={(e) => {
                const newSections = [...sections];
                newSections[sectionIndex].content = e.target.value;
                setSections(newSections);
              }}
              rows={6}
              className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
              required
            />
          </div>

          <div className="space-y-4">
            {section.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border-t border-ftm-line pt-5">
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
                    className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
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
                        className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
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
                      className="w-20 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink tabular-nums transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => addQuestion(sectionIndex)}
              className="mt-3 px-4 py-2.5 border border-ftm-line2 font-inter font-semibold text-[14px] text-ftm-ink hover:bg-ftm-up transition-colors"
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
          className="px-4 py-2.5 border border-ftm-line2 font-inter font-semibold text-[14px] text-ftm-ink hover:bg-ftm-up transition-colors"
        >
          Add Section
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className={`px-5 py-2.5 font-inter font-bold text-[14px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep transition-colors ${
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
        <div className="border-t-2 border-ftm-line2 pt-6 space-y-5">
          <h3 className="text-lg font-medium">Test Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Title</label>
              <input
                type="text"
                value={testMetadata.title}
                onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Date</label>
              <input
                type="date"
                value={testMetadata.test_date}
                onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
  
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Description (Optional)</label>
              <textarea
                value={testMetadata.description}
                onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                rows={3}
              />
            </div>
          </div>
        </div>
  
        {/* Questions Section */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="border-t-2 border-ftm-line2 pt-6 space-y-5">
            <h3 className="text-lg font-medium">{section.title}</h3>
            
            <div className="space-y-4">
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border-t border-ftm-line pt-5">
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
                      className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
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
                          className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
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
                        className="w-20 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink tabular-nums transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => addQuestion(sectionIndex)}
                className="mt-3 px-4 py-2.5 border border-ftm-line2 font-inter font-semibold text-[14px] text-ftm-ink hover:bg-ftm-up transition-colors"
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
            className="px-4 py-2.5 border border-ftm-line2 font-inter font-semibold text-[14px] text-ftm-ink hover:bg-ftm-up transition-colors"
          >
            Add Recording Section
          </button>
  
          <button
            type="submit"
            disabled={isLoading}
            className={`px-5 py-2.5 font-inter font-bold text-[14px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep transition-colors ${
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

  // AI drafting — fills the three prompts (persuasive, argumentative,
  // reflective) for review and editing; nothing is saved until Create Test.
  const [aiTheme, setAiTheme] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const generateWithAI = async () => {
    if (prompts.some(p => p.text.trim()) &&
        !window.confirm('Replace the prompts you have typed with AI drafts?')) {
      return;
    }
    setAiBusy(true);
    setAiError('');
    try {
      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: aiTheme }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Generation failed');
      setPrompts(data.prompts);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

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
        <div className="border-t-2 border-ftm-line2 pt-6 space-y-5">
          <h3 className="text-lg font-medium">Test Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Title</label>
              <input
                type="text"
                value={testMetadata.title}
                onChange={(e) => setTestMetadata({...testMetadata, title: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Test Date</label>
              <input
                type="date"
                value={testMetadata.test_date}
                onChange={(e) => setTestMetadata({...testMetadata, test_date: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
  
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">Description (Optional)</label>
              <textarea
                value={testMetadata.description}
                onChange={(e) => setTestMetadata({...testMetadata, description: e.target.value})}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                rows={3}
              />
            </div>
          </div>
        </div>
  
        {/* AI drafting */}
        <div className="border-t-2 border-ftm-line2 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Generate prompts with AI</h3>
            <span className="text-xs text-ftm-dim">drafts all three types. Edit before saving.</span>
          </div>
          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={aiTheme}
              onChange={(e) => setAiTheme(e.target.value)}
              placeholder="Optional theme, e.g. technology and daily life (leave blank for varied topics)"
              className="flex-1 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
            />
            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiBusy}
              className={`px-5 py-2.5 font-inter font-bold text-[14px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep transition-colors whitespace-nowrap ${
                aiBusy ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {aiBusy ? 'Generating…' : 'Generate prompts'}
            </button>
          </div>
          {aiError && <p className="text-sm text-ftm-ochre">{aiError}</p>}
        </div>

        {/* Writing prompts — the shared editor (edit-test uses the same one,
            so create and edit can no longer drift apart) */}
        <div className="border-t-2 border-ftm-line2 pt-6">
          <WritingTestEditor content={prompts} onChange={setPrompts} />
        </div>
  
        {/* Form buttons — Add Prompt lives inside the shared editor now */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-5 py-2.5 font-inter font-bold text-[14px] text-white bg-ftm-crimson hover:bg-ftm-crimsondeep transition-colors ${
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
      <div className="min-h-screen bg-ftm-night">
        <div className="max-w-3xl mx-auto">
          <div className="border-t-2 border-ftm-line2 pt-6">
            <h2 className="text-2xl font-bold mb-6">Create New Test</h2>
            <p className="text-ftm-mut mb-6">Select the type of test you want to create:</p>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {['Reading', 'Listening', 'Writing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTestType(type.toLowerCase())}
                  className="flex flex-col items-center justify-center p-6 border-2 border-ftm-line2 rounded hover:border-ftm-crimson hover:bg-ftm-up transition-colors"
                >
                  <span className="text-xl font-medium text-ftm-ink">{type}</span>
                  <span className="mt-2 text-sm text-ftm-mut">
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
    <div className="min-h-screen bg-ftm-night">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-6 border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 font-inter text-[14px] text-ftm-ink">
            {error}
          </div>
        )}

        <div className="border-t-2 border-ftm-line2 pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Create {testType.charAt(0).toUpperCase() + testType.slice(1)} Test</h2>
            <button
              onClick={() => setTestType('')}
              className="text-ftm-mut hover:text-ftm-ink"
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