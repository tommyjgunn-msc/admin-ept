// components/QuestionTestEditor.js
import { useState } from 'react';
import PreviewModal from './PreviewModal';

export default function QuestionTestEditor({ type, content, onChange }) {
  // content is already structured sections (transformed once on load by the
  // edit page). Fall back to a single empty section when there's nothing yet.
  const initialSections = (Array.isArray(content) && content.length > 0)
    ? content
    : [{
        title: '',
        content: '',
        questions: [{
          text: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1
        }]
      }];

  const [sections, setSections] = useState(initialSections);
  const [previewSection, setPreviewSection] = useState(null);

  const updateSection = (sectionIndex, field, value) => {
    const newSections = [...sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      [field]: value
    };
    setSections(newSections);
    onChange(newSections);
  };

  const updateQuestion = (sectionIndex, questionIndex, field, value) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = {
      ...newSections[sectionIndex].questions[questionIndex],
      [field]: value
    };
    setSections(newSections);
    onChange(newSections);
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: '',
        content: '',
        questions: [{
          text: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1
        }]
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
    onChange(newSections);
  };

  const removeSection = (sectionIndex) => {
    const newSections = sections.filter((_, index) => index !== sectionIndex);
    setSections(newSections);
    onChange(newSections);
  };

  const removeQuestion = (sectionIndex, questionIndex) => {
    const newSections = [...sections];
    if (newSections[sectionIndex] && newSections[sectionIndex].questions) {
      // Remove the question
      newSections[sectionIndex].questions = newSections[sectionIndex].questions
        .filter((_, index) => index !== questionIndex);
      
      // Ensure at least one question remains
      if (newSections[sectionIndex].questions.length === 0) {
        newSections[sectionIndex].questions = [{
          text: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1
        }];
      }

      // Emit structured sections, consistent with every other handler.
      setSections(newSections);
      onChange(newSections);
    }
  };
  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {type.charAt(0).toUpperCase() + type.slice(1)} Test Sections
        </h3>
        <button
          type="button"
          onClick={addSection}
          className="font-inter font-semibold text-[13px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
        >
          Add Section
        </button>
      </div>

      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-ftm-up rounded p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">
                Section Title
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                type="button"
                onClick={() => setPreviewSection(section)}
                className="font-inter font-semibold text-[13px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="text-ftm-ochre hover:text-ftm-ochre"
              >
                Remove Section
              </button>
            </div>
          </div>

          {type === 'reading' && (
            <div>
              <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">
                Reading Passage
              </label>
              <textarea
                value={section.content}
                onChange={(e) => updateSection(sectionIndex, 'content', e.target.value)}
                rows={6}
                className="mt-1 block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                required
              />
            </div>
          )}

          <div className="space-y-4">
            {section.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border-t border-ftm-line pt-5">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-medium text-ftm-slate">
                    Question {questionIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeQuestion(sectionIndex, questionIndex)}
                    className="text-ftm-ochre hover:text-ftm-ochre text-sm"
                  >
                    Remove Question
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'text', e.target.value)}
                      className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                      placeholder="Question text"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...question.options];
                            newOptions[optionIndex] = e.target.value;
                            updateQuestion(sectionIndex, questionIndex, 'options', newOptions);
                          }}
                          className="block w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink transition-colors"
                          placeholder={`Option ${optionIndex + 1}`}
                          required
                        />
                        <input
                          type="radio"
                          name={`correct-${sectionIndex}-${questionIndex}`}
                          checked={question.correctAnswer === option}
                          onChange={() => updateQuestion(sectionIndex, questionIndex, 'correctAnswer', option)}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block font-inter font-bold text-[13px] text-ftm-ink mb-1.5">
                      Points
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'points', parseInt(e.target.value))}
                      className="mt-1 w-20 bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink tabular-nums transition-colors"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addQuestion(sectionIndex)}
              className="mt-4 text-sm font-inter font-semibold text-[13px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
            >
              Add Question
            </button>
          </div>
        </div>
      ))}

      <PreviewModal
        isOpen={!!previewSection}
        onClose={() => setPreviewSection(null)}
      >
        {previewSection && (
          <div className="space-y-8">
            <div className="bg-ftm-up p-6 rounded">
              <h3 className="text-xl font-medium mb-4">{previewSection.title}</h3>
              {type === 'reading' && (
                <div className="prose max-w-none mb-8">
                  {previewSection.content}
                </div>
              )}
              <div className="space-y-6">
                {previewSection.questions.map((question, index) => (
                  <div key={index} className="border rounded p-4">
                    <p className="font-medium mb-3">
                      {index + 1}. {question.text}
                    </p>
                    <div className="space-y-2 ml-4">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`preview-question-${index}`}
                            disabled
                          />
                          <label>{option}</label>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-ftm-mut">
                      Points: {question.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PreviewModal>
    </div>
  );
}