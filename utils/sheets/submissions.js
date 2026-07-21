// utils/sheets/submissions.js — Submissions reads/writes and test stats.
//
// Column layout lives in ../sheetSchema (COLS.SUBMISSIONS). ept-portal writes
// A..K on every section submit; the AI grader fills C (score) and adds
// L (feedback) and M (audit stamp) afterwards.
import { getGoogleSheets } from './client';
import { SHEETS, RANGES, COLS } from '../sheetSchema';

const S = COLS.SUBMISSIONS;

export async function recordSubmission(submissionData) {
  try {
    const sheets = await getGoogleSheets();
    const { test_id, student_id, score, completed, responses } = submissionData;

    // Legacy admin-side submission path: writes the six core columns only.
    const values = [[
      test_id,
      student_id,
      score.toString(),
      completed.toString(),
      JSON.stringify(responses),
      new Date().toISOString()
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.SUBMISSIONS_CORE,
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.SUBMISSIONS_PORTAL,
    });

    const submissions = (response.data.values || [])
      .filter(row => row[S.TEST_ID] === test_id);

    const totalSubmissions = submissions.length;

    // Find test row index
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.TESTS,
    });

    const testIndex = (testsResponse.data.values || [])
      .findIndex(row => row[COLS.TESTS.TEST_ID] === test_id);
    if (testIndex === -1) return;

    // Update submission count in test metadata (Tests column H)
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEETS.TESTS}!H${testIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[totalSubmissions.toString()]]
      }
    });
  } catch (error) {
    console.error('Error updating test stats:', error);
  }
}

export async function getWritingSubmissions() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.SUBMISSIONS_FULL,
  });

  return (response.data.values || [])
    .map((row, index) => ({
      rowNumber: index + 2, // sheet is 1-based and row 1 is the header
      test_id: String(row[S.TEST_ID] || ''),
      student_id: String(row[S.STUDENT_ID] || ''),
      score: row[S.SCORE] === undefined ? '' : String(row[S.SCORE]).trim(),
      completed: String(row[S.COMPLETED] || ''),
      responses: row[S.RESPONSES] || '',
      submitted_at: row[S.TIMESTAMP] || '',
      feedback: row[S.AI_FEEDBACK] || '',
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

  const scoreRange = `${SHEETS.SUBMISSIONS}!C${rowNumber}:D${rowNumber}`;

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: scoreRange,
  });

  const [existingScore, existingCompleted] = current.data.values?.[0] || [];
  if (existingScore !== undefined && String(existingScore).trim() !== '') {
    const error = new Error('This submission already has a score');
    error.code = 'already_graded';
    throw error;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: scoreRange,
    valueInputOption: 'RAW',
    requestBody: {
      // ept-portal already writes completed='true'; preserve whatever is there
      // rather than clobbering it.
      values: [[String(score), existingCompleted || 'true']],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEETS.SUBMISSIONS}!L${rowNumber}:M${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[String(feedback || '').slice(0, 45000), `${model} @ ${new Date().toISOString()}`]],
    },
  });

  return true;
}
