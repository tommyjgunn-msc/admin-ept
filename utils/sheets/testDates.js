// utils/sheets/testDates.js — TestDates: admin-managed bookable dates.
//
// This tab is the source of truth for the dates students can book in
// ept-portal (which previously read a hardcoded testDatesConfig.js).
// Column layout lives in ../sheetSchema (COLS.TEST_DATES).
//
// date_iso is the machine truth. The 'Friday, 21 August' display string that
// bookings are keyed on is DERIVED from it in ept-portal — never typed by
// hand — which is what removes the yearless-date and wrong-weekday problems.
import { getGoogleSheets } from './client';
import { SHEETS, RANGES, COLS } from '../sheetSchema';

const C = COLS.TEST_DATES;

export function testDateId(dateIso) {
  return `td_${String(dateIso).replace(/-/g, '')}`;
}

function rowToTestDate(row, index) {
  return {
    id: row[C.ID] || '',
    date_iso: String(row[C.DATE_ISO] || '').replace(/^'|'$/g, '').trim(),
    venues: Number(row[C.VENUES]) || 4,
    capacity: {
      withLaptop: Number(row[C.CAP_WITH_LAPTOP]) || 0,
      withoutLaptop: Number(row[C.CAP_WITHOUT_LAPTOP]) || 0,
    },
    status: String(row[C.STATUS] || 'published').trim(),
    updated_by: row[C.UPDATED_BY] || '',
    updated_at: row[C.UPDATED_AT] || '',
    // 1-based sheet row, used to target updates/deletes
    rowNumber: index + 2,
  };
}

/**
 * Read every TestDates row. Returns [] if the tab does not exist yet, so
 * callers can offer to seed it rather than erroring.
 */
export async function getTestDates() {
  const sheets = await getGoogleSheets();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.TEST_DATES,
    });
    return (response.data.values || [])
      .map(rowToTestDate)
      .filter(entry => entry.date_iso)
      .sort((a, b) => a.date_iso.localeCompare(b.date_iso));
  } catch (error) {
    if (String(error.message || '').includes('Unable to parse range')) {
      return [];
    }
    throw error;
  }
}

/** Create the TestDates tab with its header row. Safe to call repeatedly. */
export async function ensureTestDatesSheet() {
  const sheets = await getGoogleSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });

  const exists = (meta.data.sheets || []).some(
    sheet => sheet.properties?.title === SHEETS.TEST_DATES
  );
  if (exists) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: SHEETS.TEST_DATES } } }],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.TEST_DATES_HEADER,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        'id', 'date_iso', 'venues', 'cap_with_laptop',
        'cap_without_laptop', 'status', 'updated_by', 'updated_at',
      ]],
    },
  });

  return true;
}

function toRow(entry, updatedBy) {
  return [
    entry.id || testDateId(entry.date_iso),
    entry.date_iso,
    String(entry.venues ?? 4),
    String(entry.capacity?.withLaptop ?? 0),
    String(entry.capacity?.withoutLaptop ?? 0),
    entry.status || 'published',
    updatedBy || '',
    new Date().toISOString(),
  ];
}

export async function createTestDate(entry, updatedBy) {
  await ensureTestDatesSheet();
  const existing = await getTestDates();
  if (existing.some(row => row.date_iso === entry.date_iso)) {
    const error = new Error('A test date already exists for that day');
    error.code = 'duplicate_date';
    throw error;
  }

  const sheets = await getGoogleSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.TEST_DATES,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRow(entry, updatedBy)] },
  });

  return toRow(entry, updatedBy);
}

export async function updateTestDate(id, entry, updatedBy) {
  const existing = await getTestDates();
  const target = existing.find(row => row.id === id);
  if (!target) {
    const error = new Error('Test date not found');
    error.code = 'not_found';
    throw error;
  }

  // Moving a date onto a day that already has an entry would create two
  // competing rows for the same day.
  if (
    entry.date_iso !== target.date_iso &&
    existing.some(row => row.date_iso === entry.date_iso)
  ) {
    const error = new Error('A test date already exists for that day');
    error.code = 'duplicate_date';
    throw error;
  }

  const sheets = await getGoogleSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEETS.TEST_DATES}!A${target.rowNumber}:H${target.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [toRow({ ...entry, id }, updatedBy)] },
  });

  return { ...entry, id };
}

/**
 * Soft-delete: mark the row cancelled rather than removing it, so any bookings
 * already made against that day keep resolving to a real record.
 */
export async function cancelTestDate(id, updatedBy) {
  const existing = await getTestDates();
  const target = existing.find(row => row.id === id);
  if (!target) {
    const error = new Error('Test date not found');
    error.code = 'not_found';
    throw error;
  }

  const sheets = await getGoogleSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEETS.TEST_DATES}!F${target.rowNumber}:H${target.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['cancelled', updatedBy || '', new Date().toISOString()]],
    },
  });

  return true;
}

/**
 * Which test types already exist for each date, derived from the Tests tab.
 * test_id is `${type}_${YYYYMMDD}` (see pages/api/test.js), so the authored
 * types for a day can be read straight off the ids.
 *
 * This is advisory only — it drives a "no test authored yet" warning in the
 * admin UI. It deliberately does NOT gate what students can book, because a
 * date disappearing from booking because nobody wrote the test yet would be a
 * worse failure than the warning.
 */
export async function getAuthoredTestTypesByDate() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.TESTS,
  });

  return (response.data.values || []).reduce((acc, row) => {
    const match = String(row[COLS.TESTS.TEST_ID] || '').match(/^(reading|writing|listening)_(\d{4})(\d{2})(\d{2})$/);
    if (!match) return acc;
    const [, type, year, month, day] = match;
    const iso = `${year}-${month}-${day}`;
    if (!acc[iso]) acc[iso] = [];
    if (!acc[iso].includes(type)) acc[iso].push(type);
    return acc;
  }, {});
}
