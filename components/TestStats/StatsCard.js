// components/TestStats/StatsCard.js
export default function StatsCard({ title, value, subtitle }) {
    return (
      <div className="bg-ftm-card shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-ftm-ink">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-ftm-slate">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-ftm-mut">{subtitle}</p>
        )}
      </div>
    );
  }