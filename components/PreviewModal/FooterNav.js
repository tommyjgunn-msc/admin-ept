 // components/PreviewModal/FooterNav.js
 export default function FooterNav({ onNext, onPrev, isLastSection, isFirstSection }) {
    return (
      <div className="border-t px-6 py-4 flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={isFirstSection}
          className={`px-4 py-2 rounded ${isFirstSection 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-indigo-600 hover:bg-indigo-50'}`}
        >
          Previous Section
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {isLastSection ? 'Submit Test' : 'Next Section'}
        </button>
      </div>
    );
  }