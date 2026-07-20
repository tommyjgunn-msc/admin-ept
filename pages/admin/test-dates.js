// pages/admin/test-dates.js — Manage the test dates students can book.
//
// These used to be hardcoded in ept-portal/utils/testDatesConfig.js and needed
// a code change + redeploy to alter. They now live in the TestDates tab.
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/AdminShell';

const ALL_TYPES = ['reading', 'writing', 'listening'];

// Mirrors ept-portal's toDisplayDate: this is how the date is shown to
// students and how existing bookings are keyed. Derived, never typed.
function toDisplayDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      timeZone: 'UTC',
    })
    .replace(/^(\w+)\s/, '$1, ');
}

const BLANK = {
  date_iso: '',
  venues: 4,
  capacity: { withLaptop: 70, withoutLaptop: 30 },
  status: 'published',
};

export default function TestDates() {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/test-dates');
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Failed to load test dates');
      const data = await response.json();
      setDates(data.dates || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionStorage.getItem('adminData')) {
      router.push('/login');
      return;
    }
    load();
  }, [router, load]);

  const send = async (method, body) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/test-dates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        sessionStorage.removeItem('adminData');
        router.push('/login');
        return false;
      }
      if (!response.ok) throw new Error(result.message || 'Request failed');
      setNotice(result.message || 'Saved');
      await load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      venues: Number(form.venues),
      capacity: {
        withLaptop: Number(form.capacity.withLaptop),
        withoutLaptop: Number(form.capacity.withoutLaptop),
      },
    };
    const ok = editingId
      ? await send('PUT', { ...payload, id: editingId })
      : await send('POST', payload);
    if (ok) {
      setForm(BLANK);
      setEditingId(null);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      date_iso: entry.date_iso,
      venues: entry.venues,
      capacity: { ...entry.capacity },
      status: entry.status,
    });
    setNotice('');
    setError('');
  };

  const cancelDate = async (entry) => {
    if (!window.confirm(`Cancel ${toDisplayDate(entry.date_iso)}? Students will no longer see it.`)) return;
    await send('DELETE', { id: entry.id });
  };

  const field = 'w-full bg-ftm-night border border-white/[.12] rounded px-2.5 py-1.5 font-inter text-[13px] text-ftm-ink focus:outline-none focus:border-ftm-red/60';
  const label = 'block font-inter text-[11px] uppercase tracking-wide text-ftm-dim mb-1';

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-grotesk text-xl text-ftm-ink">Test dates</h1>
          <p className="font-inter text-[13px] text-ftm-mut mt-1">
            Dates students can book. Students only see dates from today to three weeks out.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-red/40 bg-ftm-red/[.08] font-inter text-[13px] text-ftm-red">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 px-3 py-2 rounded border border-ftm-green/40 bg-ftm-green/[.08] font-inter text-[13px] text-ftm-green">
            {notice}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mb-7 p-4 rounded-lg bg-ftm-bar border border-white/[.08] grid gap-3 sm:grid-cols-5 items-end"
        >
          <div className="sm:col-span-2">
            <label className={label} htmlFor="date_iso">Date</label>
            <input
              id="date_iso"
              type="date"
              required
              className={field}
              value={form.date_iso}
              onChange={(e) => setForm({ ...form, date_iso: e.target.value })}
            />
            {form.date_iso && (
              <p className="font-inter text-[11px] text-ftm-dim mt-1">
                Students see: {toDisplayDate(form.date_iso)}
              </p>
            )}
          </div>
          <div>
            <label className={label} htmlFor="venues">Venues</label>
            <input
              id="venues" type="number" min="0" className={field}
              value={form.venues}
              onChange={(e) => setForm({ ...form, venues: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="withLaptop">With laptop</label>
            <input
              id="withLaptop" type="number" min="0" className={field}
              value={form.capacity.withLaptop}
              onChange={(e) => setForm({ ...form, capacity: { ...form.capacity, withLaptop: e.target.value } })}
            />
          </div>
          <div>
            <label className={label} htmlFor="withoutLaptop">No laptop</label>
            <input
              id="withoutLaptop" type="number" min="0" className={field}
              value={form.capacity.withoutLaptop}
              onChange={(e) => setForm({ ...form, capacity: { ...form.capacity, withoutLaptop: e.target.value } })}
            />
          </div>

          <div className="sm:col-span-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="px-3.5 py-1.5 rounded bg-ftm-red text-white font-inter font-medium text-[13px] disabled:opacity-50"
            >
              {editingId ? 'Save changes' : 'Add date'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(BLANK); }}
                className="font-inter text-[13px] text-ftm-dim hover:text-ftm-slate"
              >
                Cancel edit
              </button>
            )}
            <select
              className={`${field} w-auto ml-auto`}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </form>

        {loading ? (
          <p className="font-inter text-[13px] text-ftm-dim">Loading…</p>
        ) : dates.length === 0 ? (
          <div className="p-6 rounded-lg bg-ftm-bar border border-white/[.08] text-center">
            <p className="font-inter text-[13px] text-ftm-mut mb-3">
              No dates yet. Import the existing list from the portal to get started —
              students keep seeing the old dates until you do.
            </p>
            <button
              onClick={() => send('POST', { action: 'seed' })}
              disabled={busy}
              className="px-3.5 py-1.5 rounded bg-ftm-red text-white font-inter font-medium text-[13px] disabled:opacity-50"
            >
              Import existing dates
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-ftm-bar border border-white/[.08] overflow-hidden">
            {dates.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3 border-b border-white/[.06] last:border-b-0 flex items-center gap-4 flex-wrap"
              >
                <div className="min-w-[190px]">
                  <p className="font-inter text-[14px] text-ftm-ink">{toDisplayDate(entry.date_iso)}</p>
                  <p className="font-inter text-[11px] text-ftm-dim">{entry.date_iso}</p>
                </div>

                <p className="font-inter text-[12px] text-ftm-mut min-w-[150px]">
                  {entry.venues} venues · {entry.capacity.withLaptop}/{entry.capacity.withoutLaptop} seats
                </p>

                <span
                  className={`font-inter text-[11px] px-2 py-0.5 rounded ${
                    entry.status === 'published'
                      ? 'text-ftm-green bg-ftm-green/[.10]'
                      : 'text-ftm-dim bg-white/[.06]'
                  }`}
                >
                  {entry.status}
                </span>

                {entry.missingTests?.length > 0 && (
                  <span
                    className="font-inter text-[11px] px-2 py-0.5 rounded text-ftm-amber bg-ftm-amber/[.10]"
                    title="Students can still book this date; the test just is not written yet."
                  >
                    no {entry.missingTests.join('/')} test yet
                  </span>
                )}
                {entry.missingTests?.length === 0 && (
                  <span className="font-inter text-[11px] px-2 py-0.5 rounded text-ftm-green bg-ftm-green/[.10]">
                    all {ALL_TYPES.length} tests ready
                  </span>
                )}

                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => startEdit(entry)}
                    className="font-inter text-[12px] text-ftm-slate hover:text-ftm-ink"
                  >
                    Edit
                  </button>
                  {entry.status !== 'cancelled' && (
                    <button
                      onClick={() => cancelDate(entry)}
                      className="font-inter text-[12px] text-ftm-dim hover:text-ftm-red"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
