// pages/api/tests.js
import { getGoogleSheets } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const sheets = await getGoogleSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Tests!A2:G',
      });

      const tests = (response.data.values || []).map(row => ({
        test_id: row[0],
        type: row[1],
        title: row[2],
        description: row[3],
        created_at: row[4],
        test_date: row[5],
        total_points: row[6]
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