// components/PreviewModal.js
import { useState, useEffect } from 'react';
import NavigationBar from './PreviewModal/NavigationBar';
import FooterNav from './PreviewModal/FooterNav';

// Helper function defined outside the component
const transformContent = (rawContent, testType) => {
  if (!testType || !Array.isArray(rawContent)) return [];
  
  if (testType === 'writing') {
    return rawContent;
  }
  
  // For debugging
  console.log("Raw content:", rawContent);
  
  const sectionMap = {};
  
  for (let i = 0; i < rawContent.length; i++) {
    const item = rawContent[i];
    if (!Array.isArray(item)) continue;
    
    const sectionIndex = item[1];
    const title = item[2] || '';
    const sectionContent = item[3] || '';
    const questionIndex = item[4];
    const questionText = item[5] || '';
    const optionsStr = item[6] || '[]';
    const correctAnswer = item[7] || '';
    
    if (!sectionIndex || !questionIndex) continue;
    
    if (!sectionMap[sectionIndex]) {
      sectionMap[sectionIndex] = {
        title: title,
        content: sectionContent,
        questions: []
      };
    }
    
    let options = [];
    try {
      options = JSON.parse(optionsStr);
    } catch (err) {
      console.error('Error parsing options:', err);
    }
    
    const qIdx = parseInt(questionIndex) - 1;
    while (sectionMap[sectionIndex].questions.length <= qIdx) {
      sectionMap[sectionIndex].questions.push({ 
        text: '', 
        options: [], 
        correctAnswer: '' 
      });
    }
    
    sectionMap[sectionIndex].questions[qIdx] = {
      text: questionText,
      options: options,
      correctAnswer: correctAnswer
    };
  }
  
  // Convert to array and sort by section index
  const result = Object.keys(sectionMap)
    .sort()
    .map(key => sectionMap[key]);
  
  console.log("Transformed sections:", result);
  return result;
};

// Split the modal into multiple components to avoid conditional returns
function ErrorModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-ftm-card rounded p-6">
        <h2 className="text-xl font-bold text-ftm-ochre">Error</h2>
        <p className="mt-2">Invalid test data provided.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-ftm-up hover:bg-ftm-card border border-ftm-line transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ModalContent({ test, content, onClose }) {
  // Always at least 1 section
  const processedContent = test.type === 'writing' ? content : transformContent(content, test.type);
  const totalSections = Math.max(1, processedContent.length);
  
  const [currentSection, setCurrentSection] = useState(0);
  const [sections, setSections] = useState(processedContent);
  const [responses, setResponses] = useState({});
  const [essayResponse, setEssayResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(
    test.type === 'writing' ? '45:00' : '60:00'
  );
  const [hasStarted, setHasStarted] = useState(true); // Auto-start for preview
  
  // Log the content for debugging
  useEffect(() => {
    console.log("Test type:", test.type);
    console.log("Original content:", content);
    console.log("Processed sections:", sections);
  }, [test.type, content, sections]);

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

  // Add Print functionality
  const handlePrint = () => {
    window.print();
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
    alert('Test submitted! In the actual test, responses would be saved and scored.');
    onClose();
  };

  const getCurrentContent = () => {
    if (test.type === 'writing') {
      return currentSection < sections.length ? sections[currentSection] : { type: '', text: '', wordLimit: 0 };
    } else {
      return currentSection < sections.length ? sections[currentSection] : { title: '', content: '', questions: [] };
    }
  };

  // Display passage content for debugging
  const currentSectionData = getCurrentContent();
  console.log("Current section data:", currentSectionData);

  return (
    <>
      {/* Preview controls. Were two circular icon-only buttons in the corner
          with no accessible label beyond aria-label and no hover change (both
          hover states resolved to the same colour). Now labelled text. */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="font-inter font-semibold text-[12px] text-ftm-mut hover:text-ftm-ink underline underline-offset-4 transition-colors"
        >
          Print
        </button>
        <button
          onClick={onClose}
          className="font-inter font-semibold text-[12px] text-ftm-mut hover:text-ftm-ink underline underline-offset-4 transition-colors"
        >
          Close preview
        </button>
      </div>

      {/* The same status band the candidate sees, so a preview shows the real
          thing rather than an approximation of it. */}
      <div className="bg-ftm-bar border-b border-ftm-line2 px-6 py-3 flex justify-between items-baseline gap-6">
        <span className="font-inter text-[13px] text-ftm-mut">
          Section <span className="tabular-nums">{currentSection + 1}</span> of{' '}
          <span className="tabular-nums">{totalSections}</span>
        </span>
        <span className="flex items-baseline gap-3 border-l-[6px] border-ftm-line2 pl-3">
          <span className="font-inter font-bold text-[10px] tracking-[.14em] uppercase text-ftm-dim">Time left</span>
          <time className="font-grotesk font-bold text-[17px] text-ftm-ink tabular-nums">{timeRemaining}</time>
        </span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {test.type === 'writing' ? (
          <WritingPreview 
            prompt={getCurrentContent()}
            response={essayResponse}
            onChange={handleEssayChange}
          />
        ) : (
          <QuestionPreview 
            section={getCurrentContent()}
            type={test.type}
            responses={responses}
            onSelect={handleOptionSelect}
          />
        )}
      </div>

      <div className="border-t px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
          disabled={currentSection === 0}
          className={`px-4 py-2 rounded ${currentSection === 0 
            ? 'text-ftm-dim cursor-not-allowed' 
            : 'text-ftm-slate hover:bg-ftm-up'}`}
        >
          Previous Section
        </button>
        <button
          onClick={() => {
            if (currentSection >= totalSections - 1) {
              onClose();
            } else {
              setCurrentSection(prev => prev + 1);
            }
          }}
          className="px-4 py-2 bg-ftm-crimson text-white hover:bg-ftm-crimsondeep font-bold transition-colors"
        >
          {currentSection >= totalSections - 1 ? 'Close Preview' : 'Next Section'}
        </button>
      </div>
    </>
  );
}

// Main PreviewModal component - no conditional logic that affects hook order
export default function PreviewModal({ isOpen, onClose, test = {}, content = [] }) {
  if (!isOpen) {
    return null;
  }

  // Log the incoming props for debugging
  console.log("PreviewModal props:", { test, contentLength: content?.length });

  // Ensure we have a container even when showing errors
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 print:bg-ftm-card">
      <div className="bg-ftm-card w-full max-w-5xl h-[90vh] flex flex-col rounded relative print:h-auto print:max-h-none">
        {!test || !test.type ? (
          <ErrorModal onClose={onClose} />
        ) : (
          <ModalContent test={test} content={content} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function WritingPreview({ prompt, response, onChange }) {
  if (!prompt) {
    return <div>No prompt data available</div>;
  }

  // Handle both object and array formats
  const promptType = prompt.type || prompt[2] || "ESSAY";
  const promptText = prompt.text || prompt[3] || "";
  const wordLimit = prompt.wordLimit || prompt[4] || 500;

  return (
    <div className="space-y-6">
      <div className="bg-ftm-card border border-ftm-line p-6">
        <div className="mb-4">
          <span className="uppercase text-sm font-semibold text-ftm-mut">
            {promptType} ESSAY
          </span>
        </div>
        <p className="text-lg mb-4">{promptText}</p>
        <p className="text-sm text-ftm-mut">Word limit: {wordLimit} words</p>
      </div>

      <div className="mt-6">
        <textarea
          value={response}
          onChange={onChange}
          placeholder="Type your essay here..."
          className="w-full h-64 p-4 border rounded resize-none"
          rows={10}
        />
        <div className="mt-2 text-sm text-ftm-mut flex justify-between">
          <span>Word count: {response.trim().split(/\s+/).length || 0}</span>
          <span>{wordLimit} words maximum</span>
        </div>
      </div>
    </div>
  );
}

function QuestionPreview({ section, type, responses, onSelect }) {
  // Debug the section data
  console.log("QuestionPreview received section:", section);
  
  if (!section) {
    return <div className="p-4 border-l-[6px] border-ftm-ochre bg-ftm-card">
      No section data available
    </div>;
  }
  
  if (!section.questions || !Array.isArray(section.questions) || section.questions.length === 0) {
    return <div className="p-4 border-l-[6px] border-ftm-ochre bg-ftm-card">
      <p>No questions available for this section.</p>
      <p className="mt-2"><strong>Debug info:</strong></p>
      <pre className="mt-1 text-xs overflow-auto">{JSON.stringify(section, null, 2)}</pre>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Reading Passage or Listening Instructions */}
      {type === 'reading' && section.content && (
        <div className="bg-ftm-card border border-ftm-line p-6 max-w-measure">
          <h3 className="font-medium text-lg mb-4">{section.title}</h3>
          <div className="whitespace-pre-wrap">{section.content}</div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {section.questions.filter(Boolean).map((question, qIndex) => (
          <div key={qIndex} className="border rounded p-4">
            <p className="font-medium mb-4">
              {qIndex + 1}. {question.text}
            </p>
            <div className="space-y-3 ml-4">
              {Array.isArray(question.options) && question.options.map((option, oIndex) => (
                <label 
                  key={oIndex} 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-ftm-up p-2"
                >
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    checked={responses[qIndex] === option}
                    onChange={() => onSelect(qIndex, option)}
                    className="h-4 w-4 text-ftm-slate"
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