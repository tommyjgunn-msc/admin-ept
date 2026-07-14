// components/PreviewModal/NavigationBar.js
export default function NavigationBar({ currentSection, totalSections, timeRemaining }) {
    return (
      <div className="bg-ftm-night border-b px-6 py-3 flex justify-between items-center">
        <div className="flex space-x-4">
          <span className="text-sm font-medium">
            Section {currentSection} of {totalSections}
          </span>
        </div>
        {timeRemaining && (
          <div className="flex items-center text-sm font-medium">
            <span className="text-ftm-mut">Time Remaining:</span>
            <span className="ml-2 text-ftm-slate">{timeRemaining}</span>
          </div>
        )}
      </div>
    );
  }
  
 