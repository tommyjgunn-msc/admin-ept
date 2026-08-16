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

  const field = 'w-full bg-ftm-night border-2 border-ftm-line2 focus:border-ftm-ink px-3 py-2 font-inter text-[14px] text-ftm-ink tabular-nums transition-colors';
  const label = 'block font-inter font-bold text-[13px] text-ftm-ink mb-1.5';

  return (
    <AdminShell>
      <div className="max-w-[880px]">
        <div className="mb-8">
          <h1 className="font-grotesk font-bold text-[26px] text-ftm-ink">Test dates</h1>
          <p className="font-inter text-[14px] text-ftm-mut mt-1 max-w-measure">
            Dates candidates can book. They only see dates from today to three weeks out.
          </p>
        </div>

        {error && (
          <div role="alert" className="border-l-[6px] border-ftm-crimson bg-ftm-card px-5 py-4 mb-6">
            <h2 className="font-grotesk font-bold text-[15px] text-ftm-ochre mb-1">There is a problem</h2>
            <p className="font-inter text-[14px] text-ftm-ink">{error}</p>
          </div>
        )}
        {notice && (
          <div role="status" className="border-l-[6px] border-ftm-green bg-ftm-card px-5 py-4 mb-6">
            <p className="font-inter text-[14px] text-ftm-ink">{notice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t-2 border-ftm-line2 pt-6 mb-12">
          <h2 className="font-grotesk font-bold text-[17px] text-ftm-ink mb-5">
            {editingId ? 'Edit this date' : 'Add a date'}
          </h2>

          <div className="grid gap-5 sm:grid-cols-4 items-start mb-6">
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
                <p className="font-inter text-[13px] text-ftm-mut mt-1.5">
                  Candidates see <span className="text-ftm-ink font-semibold">{toDisplayDate(form.date_iso)}</span>
                </p>
              )}
            </div>
            <div>
              <label className={label} htmlFor="status">Visibility</label>
              <select
                id="status"
                className={field}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
              <label className={label} htmlFor="withLaptop">Places, own laptop</label>
              <input
                id="withLaptop" type="number" min="0" className={field}
                value={form.capacity.withLaptop}
                onChange={(e) => setForm({ ...form, capacity: { ...form.capacity, withLaptop: e.target.value } })}
              />
            </div>
            <div>
              <label className={label} htmlFor="withoutLaptop">Places, laptop provided</label>
              <input
                id="withoutLaptop" type="number" min="0" className={field}
                value={form.capacity.withoutLaptop}
                onChange={(e) => setForm({ ...form, capacity: { ...form.capacity, withoutLaptop: e.target.value } })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <button
              type="submit"
              disabled={busy}
              className="bg-ftm-crimson hover:bg-ftm-crimsondeep text-white font-inter font-bold text-[14px] px-5 py-2.5 disabled:opacity-50 transition-colors"
            >
              {editingId ? 'Save changes' : 'Add this date'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(BLANK); }}
                className="font-inter font-semibold text-[14px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <div aria-busy="true">
            <div className="ftm-skeleton h-3 w-64 mb-3" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-6 py-3.5 border-b border-ftm-line">
                <div className="ftm-skeleton h-4 flex-[2]" />
                <div className="ftm-skeleton h-4 flex-1" />
                <div className="ftm-skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : dates.length === 0 ? (
          <div className="border-t border-ftm-line2 pt-6 max-w-measure">
            <h2 className="font-grotesk font-bold text-[19px] text-ftm-ink mb-2">No dates here yet</h2>
            <p className="font-inter text-[15px] leading-relaxed text-ftm-mut mb-6">
              Candidates are being served the old hardcoded list until you import it. Importing brings
              across every date from today onward; nothing they can see changes until then.
            </p>
            <button
              onClick={() => send('POST', { action: 'seed' })}
              disabled={busy}
              className="bg-ftm-crimson hover:bg-ftm-crimsondeep text-white font-inter font-bold text-[15px] px-6 py-3 disabled:opacity-50 transition-colors"
            >
              Import the existing dates
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ftm-table min-w-[720px]">
              <caption className="sr-only">Bookable test dates</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">Venues</th>
                  <th scope="col" className="num">Own laptop</th>
                  <th scope="col" className="num">Provided</th>
                  <th scope="col">Visibility</th>
                  <th scope="col">Tests</th>
                  <th scope="col" className="end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row" className="text-left align-top">
                      <span className="block font-semibold text-ftm-ink">{toDisplayDate(entry.date_iso)}</span>
                      <span className="block font-inter text-[11px] text-ftm-dim tabular-nums">{entry.date_iso}</span>
                    </th>
                    <td className="num">{entry.venues}</td>
                    <td className="num">{entry.capacity.withLaptop}</td>
                    <td className="num">{entry.capacity.withoutLaptop}</td>
                    <td>
                      <span className={`ftm-status font-semibold ${entry.status === 'published' ? 'text-ftm-green' : 'text-ftm-dim'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>
                      {entry.missingTests?.length > 0 ? (
                        <span
                          className="ftm-status font-semibold text-ftm-ochre"
                          title="Candidates can still book this date; the test is just not written yet."
                        >
                          no {entry.missingTests.join(', ')} test
                        </span>
                      ) : (
                        <span className="ftm-status text-ftm-green">
                          all {ALL_TYPES.length} ready
                        </span>
                      )}
                    </td>
                    <td className="end whitespace-nowrap">
                      <span className="inline-flex gap-4">
                        <button
                          onClick={() => startEdit(entry)}
                          className="font-inter font-semibold text-[12px] text-ftm-link hover:text-ftm-ink underline underline-offset-4 transition-colors"
                        >
                          Edit
                        </button>
                        {entry.status !== 'cancelled' && (
                          <button
                            onClick={() => cancelDate(entry)}
                            className="font-inter font-semibold text-[12px] text-ftm-dim hover:text-ftm-ochre underline underline-offset-4 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
