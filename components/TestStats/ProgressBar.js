  // components/TestStats/ProgressBar.js
  export default function ProgressBar({ percentage, label }) {
    return (
      <div className="relative pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-indigo-600">
              {label}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-indigo-600">
              {percentage}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${percentage}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
          ></div>
        </div>
      </div>
    );
  }