 // components/PreviewModal/FooterNav.js
 export default function FooterNav({ onNext, onPrev, isLastSection, isFirstSection }) {
    return (
      <div className="border-t px-6 py-4 flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={isFirstSection}
          className={`px-4 py-2 rounded ${isFirstSection 
            ? 'text-ftm-dim cursor-not-allowed' 
            : 'text-ftm-slate hover:bg-ftm-slate/[.12]'}`}
        >
          Previous Section
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-ftm-red text-white rounded hover:bg-[#C51F35]"
        >
          {isLastSection ? 'Submit Test' : 'Next Section'}
        </button>
      </div>
    );
  }