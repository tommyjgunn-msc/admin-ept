// components/PreviewModal.js
import { useState, useEffect } from 'react';
import NavigationBar from './PreviewModal/NavigationBar';
import FooterNav from './PreviewModal/FooterNav';

export default function PreviewModal({ isOpen, onClose, test = {}, content = [] }) {
  // Define transformContent function before using it in state initialization
  const transformContent = (rawContent, testType) => {
    if (testType === 'writing') {
      return rawContent; // Writing tests have a different structure
    }
    
    // Transform raw content into sections with questions
    return rawContent.reduce((sections, [
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
      
      // Parse options and add question to the right section
      try {
        sections[idx].questions[parseInt(questionIndex) - 1] = {
          text: questionText,
          options: JSON.parse(optionsJson || '[]'),
          correctAnswer
        };
      } catch (error) {
        console.error('Error parsing options JSON:', error);
        sections[idx].questions[parseInt(questionIndex) - 1] = {
          text: questionText,
          options: [],
          correctAnswer
        };
      }
      
      return sections;
    }, []);
  };

  // Define all state variables at the top level
  const [currentSection, setCurrentSection] = useState(0);
  const [sections, setSections] = useState(() => {
    if (!test || !test.type) return [];
    return transformContent(content, test.type);
  });
  const [responses, setResponses] = useState({});
  const [essayResponse, setEssayResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(
    (!test || !test.type) ? '60:00' : (test.type === 'writing' ? '45:00' : '60:00')
  );
  const [hasStarted, setHasStarted] = useState(false);

  // Guard against undefined test - after state declarations
  if (!isOpen) return null;
  if (!test || !test.type) {
    console.error('Test data is missing or invalid');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-600">Error</h2>
          <p className="mt-2">Invalid test data provided.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Timer effect
  useEffect(() => {
    let timer;
    if (hasStarted && timeRemaining !== '00:00') {
      timer = setInterval(() => {
        const [mins, secs] = timeRemaining.split(':').map(Number);
        let newMins = mins;
        let newSecs = secs - 1;
        
        if (newSecs < 0) {
          newMins -= 1;
          newSecs = 59;
        }
        
        setTimeRemaining(`${String(newMins).padStart(2, '0')}:${String(newSecs).padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeRemaining, hasStarted]);

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!hasStarted) return;
      if (e.key === 'ArrowRight' && currentSection < sections.length - 1) {
        setCurrentSection(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentSection > 0) {
        setCurrentSection(prev => prev - 1);
      } else if (e.key >= '1' && e.key <= '4') {
        // Handle answer selection for current question
        const currentQuestion = currentSection; // or however you track current question
        const optionIndex = parseInt(e.key) - 1;
        if (test.type !== 'writing' && 
            sections[currentSection]?.questions?.[currentQuestion]?.options?.[optionIndex]) {
          handleOptionSelect(currentQuestion, sections[currentSection].questions[currentQuestion].options[optionIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasStarted, currentSection, sections, test.type]);

  const handleStart = () => {
    setHasStarted(true);
  };

  const handleOptionSelect = (questionIndex, option) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const handleEssayChange = (e) => {
    const text = e.target.value;
    setEssayResponse(text);
  };

  const handleSubmit = () => {
    // Simulate submission
    alert('Test submitted! In the actual test, responses would be saved and scored.');
    onClose();
  };

  // Safety check for content access
  const safeGetContent = (index) => {
    if (test.type === 'writing') {
      return index < content.length ? content[index] : { type: '', text: '', wordLimit: 0 };
    } else {
      return index < sections.length ? sections[index] : { title: '', content: '', questions: [] };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-lg">
        {!hasStarted ? (
          <StartScreen onStart={handleStart} testType={test.type} />
        ) : (
          <>
            <NavigationBar 
              currentSection={currentSection + 1}
              totalSections={test.type === 'writing' ? content.length : sections.length}
              timeRemaining={timeRemaining}
            />
            
            <div className="flex-1 overflow-auto p-6">
            {test.type === 'writing' ? (
              <WritingPreview 
                prompt={safeGetContent(currentSection)}
                response={essayResponse}
                onChange={handleEssayChange}
              />
            ) : (
              <QuestionPreview 
                section={safeGetContent(currentSection)}
                type={test.type}
                responses={responses}
                onSelect={handleOptionSelect}
              />
            )}
            </div>

            <FooterNav 
              onNext={() => {
                const maxSections = test.type === 'writing' ? content.length : sections.length;
                if (currentSection === maxSections - 1) {
                  handleSubmit();
                } else {
                  setCurrentSection(prev => prev + 1);
                }
              }}
              onPrev={() => setCurrentSection(prev => prev - 1)}
              isLastSection={currentSection === (test.type === 'writing' ? content.length - 1 : sections.length - 1)}
              isFirstSection={currentSection === 0}
            />
          </>
        )}
      </div>
    </div>
  );
}

function WritingPreview({ prompt, response, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="mb-4">
          <span className="uppercase text-sm font-semibold text-gray-600">
            {prompt.type} ESSAY
          </span>
        </div>
        <p className="text-lg mb-4">{prompt.text}</p>
        <p className="text-sm text-gray-600">Word limit: {prompt.wordLimit} words</p>
      </div>

      <div className="mt-6">
        <textarea
          value={response}
          onChange={onChange}
          placeholder="Type your essay here..."
          className="w-full h-64 p-4 border rounded-lg resize-none"
          rows={10}
        />
        <div className="mt-2 text-sm text-gray-500 flex justify-between">
          <span>Word count: {response.trim().split(/\s+/).length || 0}</span>
          <span>{prompt.wordLimit} words maximum</span>
        </div>
      </div>
    </div>
  );
}

function QuestionPreview({ section, type, responses, onSelect }) {
  if (!section || !section.questions) {
    return <div>Loading questions...</div>;
  }
  
  return (
    <div className="space-y-8">
      {/* Reading Passage or Listening Instructions */}
      {type === 'reading' && (
        <div className="bg-gray-50 p-6 rounded-lg prose max-w-none">
          <h3 className="font-medium text-lg mb-4">{section.title}</h3>
          <div className="whitespace-pre-wrap">{section.content}</div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {section.questions.map((question, qIndex) => (
          <div key={qIndex} className="border rounded-lg p-4">
            <p className="font-medium mb-4">
              {qIndex + 1}. {question.text}
            </p>
            <div className="space-y-3 ml-4">
              {question.options.map((option, oIndex) => (
                <label 
                  key={oIndex} 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    checked={responses[qIndex] === option}
                    onChange={() => onSelect(qIndex, option)}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StartScreen({ onStart, testType }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-6">Ready to begin the {testType} test?</h2>
      <div className="max-w-xl text-center space-y-4 mb-8">
        <p>You will have {testType === 'writing' ? '45' : '60'} minutes to complete this test.</p>
        <p>Make sure you're in a quiet environment and won't be disturbed.</p>
        <p className="font-medium">Click Start when you're ready to begin.</p>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Start Test
      </button>
    </div>
  );
}