// components/TestStats/StatsCard.js
export default function StatsCard({ title, value, subtitle }) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-indigo-600">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    );
  }