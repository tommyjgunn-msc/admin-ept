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
          className="text-ftm-slate hover:text-ftm-ink"
        >
          Add Section
        </button>
      </div>

      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-ftm-up rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ftm-slate">
                Section Title
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                type="button"
                onClick={() => setPreviewSection(section)}
                className="text-ftm-slate hover:text-ftm-ink"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="text-ftm-red hover:text-ftm-red"
              >
                Remove Section
              </button>
            </div>
          </div>

          {type === 'reading' && (
            <div>
              <label className="block text-sm font-medium text-ftm-slate">
                Reading Passage
              </label>
              <textarea
                value={section.content}
                onChange={(e) => updateSection(sectionIndex, 'content', e.target.value)}
                rows={6}
                className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
                required
              />
            </div>
          )}

          <div className="space-y-4">
            {section.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border border-white/[.08] rounded-md p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-medium text-ftm-slate">
                    Question {questionIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeQuestion(sectionIndex, questionIndex)}
                    className="text-ftm-red hover:text-ftm-red text-sm"
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
                      className="block w-full border border-white/[.16] rounded-md shadow-sm p-2"
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
                          className="block w-full border border-white/[.16] rounded-md shadow-sm p-2"
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
                    <label className="block text-sm font-medium text-ftm-slate">
                      Points
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'points', parseInt(e.target.value))}
                      className="mt-1 w-20 border border-white/[.16] rounded-md shadow-sm p-2"
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
              className="mt-4 text-sm text-ftm-slate hover:text-ftm-ink"
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
            <div className="bg-ftm-up p-6 rounded-lg">
              <h3 className="text-xl font-medium mb-4">{previewSection.title}</h3>
              {type === 'reading' && (
                <div className="prose max-w-none mb-8">
                  {previewSection.content}
                </div>
              )}
              <div className="space-y-6">
                {previewSection.questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
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