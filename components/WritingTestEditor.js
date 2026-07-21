// components/WritingTestEditor.js — the ONE writing-prompt editor, used by
// both create-test and edit-test (create-test used to carry its own inline
// copy of this UI, which is exactly how the two drifted).
//
// Fully controlled: `content` is the prompt list, every mutation goes through
// `onChange`. That is what lets the AI "generate prompts" flow drop drafts
// straight into the editor.
import { useState } from 'react';
import PreviewModal from './PreviewModal';

const DEFAULT_PROMPT = { type: 'argumentative', text: '', wordLimit: 500 };

export default function WritingTestEditor({ content, onChange }) {
  const prompts = (Array.isArray(content) && content.length > 0)
    ? content
    : [DEFAULT_PROMPT];

  const [previewPrompt, setPreviewPrompt] = useState(null);

  const updatePrompt = (index, field, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = {
      ...newPrompts[index],
      [field]: value
    };
    onChange(newPrompts);
  };

  const addPrompt = () => {
    if (prompts.length >= 3) return; // Maximum 3 prompts
    onChange([...prompts, { ...DEFAULT_PROMPT }]);
  };

  const removePrompt = (index) => {
    onChange(prompts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Writing Prompts</h3>
        {prompts.length < 3 && (
          <button
            type="button"
            onClick={addPrompt}
            className="text-ftm-slate hover:text-ftm-ink"
          >
            Add Prompt
          </button>
        )}
      </div>

      {prompts.map((prompt, index) => (
        <div key={index} className="bg-ftm-up rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-md font-medium">Prompt {index + 1}</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setPreviewPrompt(prompt)}
                className="text-ftm-slate hover:text-ftm-ink"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => removePrompt(index)}
                className="text-ftm-red hover:text-ftm-red"
              >
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ftm-slate">
              Type
            </label>
            <select
              value={prompt.type}
              onChange={(e) => updatePrompt(index, 'type', e.target.value)}
              className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
            >
              <option value="argumentative">Argumentative</option>
              <option value="persuasive">Persuasive</option>
              <option value="reflective">Reflective</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ftm-slate">
              Prompt Text
            </label>
            <textarea
              value={prompt.text}
              onChange={(e) => updatePrompt(index, 'text', e.target.value)}
              rows={4}
              className="mt-1 block w-full border border-white/[.16] rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div>
            {/* This field IS the word limit (WritingPrompts column E) — it was
                labelled "Points" with max=50 for a long time, which fought the
                default of 500 and invited someone to "fix" real word limits
                down to 50. */}
            <label className="block text-sm font-medium text-ftm-slate">
              Word Limit
            </label>
            <input
              type="number"
              value={prompt.wordLimit}
              onChange={(e) => updatePrompt(index, 'wordLimit', parseInt(e.target.value))}
              className="mt-1 block w-32 border border-white/[.16] rounded-md shadow-sm p-2"
              min="100"
              max="1000"
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
            <div className="bg-ftm-up p-6 rounded-lg">
              <div className="mb-4">
                <span className="text-sm font-medium text-ftm-mut uppercase">
                  {previewPrompt.type} Essay
                </span>
              </div>
              <div className="prose max-w-none">
                <p className="text-lg">{previewPrompt.text}</p>
              </div>
              <div className="mt-4 text-sm text-ftm-mut">
                Word limit: {previewPrompt.wordLimit}
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
