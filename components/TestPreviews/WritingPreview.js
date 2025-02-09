  // components/TestPreviews/WritingPreview.js
  export function WritingPreview({ prompt }) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-500 uppercase">
              {prompt.type} Essay
            </span>
          </div>
          <div className="prose max-w-none">
            <p className="text-lg">{prompt.text}</p>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Word limit: {prompt.wordLimit} words
          </div>
        </div>
  
        <div className="border rounded-lg p-4">
          <textarea
            className="w-full h-64 p-4 border rounded-lg"
            placeholder="Type your essay here..."
            disabled
          />
        </div>
      </div>
    );
  }