// components/WritingTestEditor.js
import { useState } from 'react';
import PreviewModal from './PreviewModal';

export default function WritingTestEditor({ content, onChange }) {
  // Transform content array format to structured data
  const initialPrompts = content.map(([
    _, promptIndex, type, text, wordLimit
  ]) => ({
    type,
    text,
    wordLimit: parseInt(wordLimit)
  })) || [];

  const [prompts, setPrompts] = useState(initialPrompts);
  const [previewPrompt, setPreviewPrompt] = useState(null);

  const updatePrompt = (index, field, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = {
      ...newPrompts[index],
      [field]: value
    };
    setPrompts(newPrompts);
    onChange(newPrompts);
  };

  const addPrompt = () => {
    if (prompts.length >= 3) return; // Maximum 3 prompts
    const newPrompts = [
      ...prompts,
      { type: 'argumentative', text: '', wordLimit: 500 } // Changed default points to 50
    ];
    setPrompts(newPrompts);
    onChange(newPrompts);
  };

  const removePrompt = (index) => {
    const newPrompts = prompts.filter((_, i) => i !== index);
    setPrompts(newPrompts);
    onChange(newPrompts);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Writing Prompts</h3>
        {prompts.length < 3 && (
          <button
            type="button"
            onClick={addPrompt}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Add Prompt
          </button>
        )}
      </div>

      {prompts.map((prompt, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-md font-medium">Prompt {index + 1}</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setPreviewPrompt(prompt)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => removePrompt(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={prompt.type}
              onChange={(e) => updatePrompt(index, 'type', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="argumentative">Argumentative</option>
              <option value="persuasive">Persuasive</option>
              <option value="reflective">Reflective</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prompt Text
            </label>
            <textarea
              value={prompt.text}
              onChange={(e) => updatePrompt(index, 'text', e.target.value)}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Points
            </label>
            <input
              type="number"
              value={prompt.wordLimit}
              onChange={(e) => updatePrompt(index, 'wordLimit', parseInt(e.target.value))}
              className="mt-1 block w-32 border border-gray-300 rounded-md shadow-sm p-2"
              min="1"
              max="50"
              required
            />
          </div>
        </div>
      ))}

      <PreviewModal
        isOpen={!!previewPrompt}
        onClose={() => setPreviewPrompt(null)}
      >
        {previewPrompt && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500 uppercase">
                  {previewPrompt.type} Essay
                </span>
              </div>
              <div className="prose max-w-none">
                <p className="text-lg">{previewPrompt.text}</p>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Points: {previewPrompt.wordLimit}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <textarea
                className="w-full h-64 p-4 border rounded-lg"
                placeholder="Student response will appear here..."
                disabled
              />
            </div>
          </div>
        )}
      </PreviewModal>
    </div>
  );
}