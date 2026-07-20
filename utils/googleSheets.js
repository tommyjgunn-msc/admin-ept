// utils/googleSheets.js
import { google } from 'googleapis';
import { timingSafeEqual } from 'crypto';

// Constant-time string compare, used for the admin password check so the
// comparison itself does not leak length/prefix information via timing.
//
// Note this is NOT the same as hashing. Hashing stored credentials only helps
// if the store leaks; since the AdminAuth sheet is deliberately kept plaintext
// with access restricted at the Drive level, hashing at compare time would add
// nothing (you would be hashing the input and comparing it to a plaintext
// cell, which simply never matches). This is the part of "handling" that can
// actually be improved without changing what is stored.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function getGoogleSheets() {
  try {
    console.log('Initializing Google Sheets client...');
    const private_key = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
      : '';

    console.log('Credential check:', {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!private_key,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      keyLength: private_key.length
    });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: private_key
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Error in getGoogleSheets:', error);
    throw error;
  }
}

export async function verifyAdminCredentials(username, password) {
  try {
    console.log('Verifying admin credentials...');
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'AdminAuth!A2:C', // Assuming columns: Username, Password, Permissions
    });

    const rows = response.data.values || [];
    const admin = rows.find(row => row[0] === username && safeEqual(row[1], password));

    if (!admin) {
      console.log('No admin found with provided credentials');
      return null;
    }

    return {
      username: admin[0],
      permissions: admin[2]
    };
  } catch (error) {
    console.error('Error verifying admin:', error);
    throw error;
  }
}

export async function recordSubmission(submissionData) {
  try {
    const sheets = await getGoogleSheets();
    const { test_id, student_id, score, completed, responses } = submissionData;

    // Format data for sheet
    const values = [[
      test_id,
      student_id,
      score.toString(),
      completed.toString(),
      JSON.stringify(responses),
      new Date().toISOString()
    ]];

    // Add to Submissions sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Submissions!A2:F',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });

    // Update test stats in Tests sheet
    await updateTestStats(test_id);

    return true;
  } catch (error) {
    console.error('Error recording submission:', error);
    throw error;
  }
}

// Helper function to update test statistics
async function updateTestStats(test_id) {
  try {
    const sheets = await getGoogleSheets();
    
    // Get all submissions for this test
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      // A..K — ept-portal writes 11 columns (type, total_points, percentage,
      // proctoring_flag, proctoring_data live in G..K). Reading only A..F meant
      // the admin side could not see scores, percentages or proctoring at all.
      // Columns A..F are identical in both writers, so widening is additive.
      range: 'Submissions!A2:K',
    });

    const submissions = (response.data.values || [])
      .filter(row => row[0] === test_id);

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(row => row[3] === 'true').length;
    
    // Find test row index
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    const testIndex = testsResponse.data.values.findIndex(row => row[0] === test_id);
    if (testIndex === -1) return;

    // Update submission count in test metadata
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Tests!H${testIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[totalSubmissions.toString()]]
      }
    });
  } catch (error) {
    console.error('Error updating test stats:', error);
  }
}

/* ------------------------------------------------------------------ *
 * TestDates — admin-managed bookable dates.
 *
 * This tab is the source of truth for the dates students can book in
 * ept-portal (which previously read a hardcoded testDatesConfig.js).
 *
 * Columns: A id | B date_iso (YYYY-MM-DD) | C venues | D cap_with_laptop
 *          E cap_without_laptop | F status | G updated_by | H updated_at
 *
 * date_iso is the machine truth. The 'Friday, 21 August' display string that
 * bookings are keyed on is DERIVED from it in ept-portal — never typed by
 * hand — which is what removes the yearless-date and wrong-weekday problems.
 * ------------------------------------------------------------------ */

const TEST_DATES_RANGE = 'TestDates!A2:H';

export function testDateId(dateIso) {
  return `td_${String(dateIso).replace(/-/g, '')}`;
}

function rowToTestDate(row, index) {
  return {
    id: row[0] || '',
    date_iso: String(row[1] || '').replace(/^'|'$/g, '').trim(),
    venues: Number(row[2]) || 4,
    capacity: {
      withLaptop: Number(row[3]) || 0,
      withoutLaptop: Number(row[4]) || 0,
    },
    status: String(row[5] || 'published').trim(),
    updated_by: row[6] || '',
    updated_at: row[7] || '',
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
      range: TEST_DATES_RANGE,
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
    sheet => sheet.properties?.title === 'TestDates'
  );
  if (exists) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: 'TestDates' } } }],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'TestDates!A1:H1',
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
    range: TEST_DATES_RANGE,
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
    range: `TestDates!A${target.rowNumber}:H${target.rowNumber}`,
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
    range: `TestDates!F${target.rowNumber}:H${target.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['cancelled', updatedBy || '', new Date().toISOString()]],
    },
  });

  return true;
}

/**
 * Which test types already exist for each date, derived from the Tests tab.
 * test_id is `${type}_${YYYYMMDD}` (see admin-ept pages/api/test.js), so the
 * authored types for a day can be read straight off the ids.
 *
 * This is advisory only — it drives a "no test authored yet" warning in the
 * admin UI. It deliberately does NOT gate what students can book, because a
 * date disappearing from booking because nobody wrote the test yet would be a
 * worse failure than the warning.
 */
/* ------------------------------------------------------------------ *
 * Writing-test grading.
 *
 * Submissions columns, as written by ept-portal:
 *   A test_id | B student_id | C score | D completed | E responses(JSON)
 *   F timestamp | G type | H total_points | I percentage
 *   J proctoring_flag | K proctoring_data
 *
 * Grades go back into C (score) exactly as the old Apps Script grader did.
 * L and M are added by this app for the model's written feedback and an
 * audit trail; they sit past everything ept-portal writes, so nothing
 * collides.
 * ------------------------------------------------------------------ */

const SUBMISSIONS_RANGE = 'Submissions!A2:M';

export async function getWritingSubmissions() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: SUBMISSIONS_RANGE,
  });

  return (response.data.values || [])
    .map((row, index) => ({
      rowNumber: index + 2, // sheet is 1-based and row 1 is the header
      test_id: String(row[0] || ''),
      student_id: String(row[1] || ''),
      score: row[2] === undefined ? '' : String(row[2]).trim(),
      completed: String(row[3] || ''),
      responses: row[4] || '',
      submitted_at: row[5] || '',
      feedback: row[11] || '',
    }))
    .filter(entry => entry.test_id.startsWith('writing_'));
}

export async function getUngradedWritingSubmissions() {
  const all = await getWritingSubmissions();
  return all.filter(entry => entry.score === '');
}

/**
 * Write a grade back. Re-reads the score cell first so a submission that was
 * graded in the meantime (a second admin, a double-click) is not overwritten.
 */
export async function saveWritingGrade(rowNumber, { score, feedback, model }) {
  const sheets = await getGoogleSheets();

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Submissions!C${rowNumber}:D${rowNumber}`,
  });

  const [existingScore, existingCompleted] = current.data.values?.[0] || [];
  if (existingScore !== undefined && String(existingScore).trim() !== '') {
    const error = new Error('This submission already has a score');
    error.code = 'already_graded';
    throw error;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Submissions!C${rowNumber}:D${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      // ept-portal already writes completed='true'; preserve whatever is there
      // rather than clobbering it.
      values: [[String(score), existingCompleted || 'true']],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Submissions!L${rowNumber}:M${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[String(feedback || '').slice(0, 45000), `${model} @ ${new Date().toISOString()}`]],
    },
  });

  return true;
}

export async function getAuthoredTestTypesByDate() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Tests!A2:G',
  });

  return (response.data.values || []).reduce((acc, row) => {
    const match = String(row[0] || '').match(/^(reading|writing|listening)_(\d{4})(\d{2})(\d{2})$/);
    if (!match) return acc;
    const [, type, year, month, day] = match;
    const iso = `${year}-${month}-${day}`;
    if (!acc[iso]) acc[iso] = [];
    if (!acc[iso].includes(type)) acc[iso].push(type);
    return acc;
  }, {});
}