// pages/api/tests.js
import { getGoogleSheets } from '../../utils/googleSheets';
import { getSubmissionCounts } from '../../utils/sheets/results';
import { withAdminAuth } from '../../utils/withAdminAuth';
import { RANGES } from '../../utils/sheetSchema';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const sheets = await getGoogleSheets();

      // Counts are computed live from the Submissions tab rather than read
      // from Tests column H. That column is only ever written by this app's
      // recordSubmission(); real student submissions arrive through
      // ept-portal, which appends to Submissions and never touches it — so the
      // stored counter has always been empty. That, plus this route only
      // mapping columns A..G, is why every test read "0 submissions".
      const [response, counts] = await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: RANGES.TESTS,
        }),
        getSubmissionCounts().catch(() => ({})),
      ]);

      const tests = (response.data.values || []).map(row => ({
        test_id: row[0],
        type: row[1],
        title: row[2],
        description: row[3],
        created_at: row[4],
        test_date: row[5],
        total_points: row[6],
        submissions_count: counts[row[0]] || 0
      }));

      res.status(200).json(tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ message: 'Failed to fetch tests' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default withAdminAuth(handler);
