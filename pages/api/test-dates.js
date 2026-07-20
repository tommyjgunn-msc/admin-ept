// pages/api/test-dates.js — Manage the bookable test dates students see.
//
// Writes the TestDates tab, which ept-portal reads instead of its old
// hardcoded utils/testDatesConfig.js.
import {
  getTestDates,
  createTestDate,
  updateTestDate,
  cancelTestDate,
  ensureTestDatesSheet,
  getAuthoredTestTypesByDate,
  testDateId,
} from '../../utils/googleSheets';
import { withAdminAuth } from '../../utils/withAdminAuth';

// The dates that lived in ept-portal/utils/testDatesConfig.js, with the real
// calendar dates they referred to. The old format ('Friday, 05 June') carried
// no year, so these ISO values are the migration's source of truth. Every
// weekday above was verified correct for 2026 before being written down.
const LEGACY_DATES = [
  '2026-06-05', '2026-06-12', '2026-06-19', '2026-06-26',
  '2026-07-10', '2026-07-15', '2026-07-24', '2026-07-31',
  '2026-08-14', '2026-08-19', '2026-08-21',
];
const LEGACY_VENUES = 4;
const LEGACY_CAPACITY = { withLaptop: 70, withoutLaptop: 30 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function validate(body, { allowPast = false } = {}) {
  const errors = [];
  const dateIso = String(body.date_iso || '').trim();

  if (!ISO_DATE.test(dateIso)) {
    errors.push('date_iso must be formatted YYYY-MM-DD');
  } else {
    const parsed = new Date(`${dateIso}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(dateIso)) {
      errors.push('date_iso is not a real calendar date');
    } else if (!allowPast && dateIso < todayIso()) {
      errors.push('date_iso cannot be in the past');
    }
  }

  const venues = Number(body.venues);
  if (!Number.isInteger(venues) || venues < 0) errors.push('venues must be a whole number');

  const withLaptop = Number(body.capacity?.withLaptop);
  const withoutLaptop = Number(body.capacity?.withoutLaptop);
  if (!Number.isInteger(withLaptop) || withLaptop < 0) errors.push('capacity.withLaptop must be a whole number');
  if (!Number.isInteger(withoutLaptop) || withoutLaptop < 0) errors.push('capacity.withoutLaptop must be a whole number');

  const status = String(body.status || 'published');
  if (!['published', 'draft', 'cancelled'].includes(status)) {
    errors.push('status must be published, draft or cancelled');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: { date_iso: dateIso, venues, capacity: { withLaptop, withoutLaptop }, status },
  };
}

async function handler(req, res) {
  const actor = req.admin?.username || '';

  if (req.method === 'GET') {
    const [dates, authored] = await Promise.all([
      getTestDates(),
      getAuthoredTestTypesByDate().catch(() => ({})),
    ]);

    return res.status(200).json({
      dates: dates.map(entry => ({
        ...entry,
        // Advisory only: which of the three sections have been written yet.
        authoredTests: authored[entry.date_iso] || [],
        missingTests: ['reading', 'writing', 'listening']
          .filter(type => !(authored[entry.date_iso] || []).includes(type)),
      })),
      seeded: dates.length > 0,
    });
  }

  if (req.method === 'POST') {
    // One-time migration of the old hardcoded list.
    if (req.body?.action === 'seed') {
      await ensureTestDatesSheet();
      const existing = await getTestDates();
      const have = new Set(existing.map(entry => entry.date_iso));
      const cutoff = todayIso();

      const toCreate = LEGACY_DATES.filter(iso => iso >= cutoff && !have.has(iso));
      for (const iso of toCreate) {
        await createTestDate(
          { id: testDateId(iso), date_iso: iso, venues: LEGACY_VENUES, capacity: LEGACY_CAPACITY, status: 'published' },
          actor
        );
      }

      return res.status(200).json({
        message: `Imported ${toCreate.length} date(s) from the legacy list`,
        imported: toCreate,
        skipped: LEGACY_DATES.filter(iso => iso < cutoff),
      });
    }

    const { valid, errors, value } = validate(req.body || {});
    if (!valid) {
      return res.status(400).json({ error: 'invalid_data', message: errors[0], errors });
    }

    try {
      await createTestDate({ ...value, id: testDateId(value.date_iso) }, actor);
      return res.status(201).json({ message: 'Test date created', date: value });
    } catch (error) {
      if (error.code === 'duplicate_date') {
        return res.status(409).json({ error: 'duplicate_date', message: error.message });
      }
      throw error;
    }
  }

  if (req.method === 'PUT') {
    const id = String(req.body?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'missing_id', message: 'id is required' });

    // Editing an existing entry may legitimately touch a past date (e.g.
    // correcting capacity after the fact), so past dates are allowed here.
    const { valid, errors, value } = validate(req.body || {}, { allowPast: true });
    if (!valid) {
      return res.status(400).json({ error: 'invalid_data', message: errors[0], errors });
    }

    try {
      await updateTestDate(id, value, actor);
      return res.status(200).json({ message: 'Test date updated', date: { ...value, id } });
    } catch (error) {
      if (error.code === 'not_found') {
        return res.status(404).json({ error: 'not_found', message: error.message });
      }
      if (error.code === 'duplicate_date') {
        return res.status(409).json({ error: 'duplicate_date', message: error.message });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query?.id || req.body?.id || '').trim();
    if (!id) return res.status(400).json({ error: 'missing_id', message: 'id is required' });

    try {
      await cancelTestDate(id, actor);
      return res.status(200).json({ message: 'Test date cancelled' });
    } catch (error) {
      if (error.code === 'not_found') {
        return res.status(404).json({ error: 'not_found', message: error.message });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

export default withAdminAuth(handler);
