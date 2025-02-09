// components/TestPreviews/ReadingPreview.js
export function ReadingPreview({ section }) {
    return (
      <div className="space-y-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-medium mb-4">{section.title}</h3>
          <div className="prose max-w-none">
            {section.content}
          </div>
        </div>
  
        <div className="space-y-6">
          {section.questions.map((question, index) => (
            <div key={index} className="border rounded-lg p-4">
              <p className="font-medium mb-3">
                {index + 1}. {question.text}
              </p>
              <div className="space-y-2 ml-4">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`question-${index}`}
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
    );
  }