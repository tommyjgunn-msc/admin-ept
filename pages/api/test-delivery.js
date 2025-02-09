// pages/api/test-delivery.js
import { getGoogleSheets } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    const { date, type, student_id } = req.query;
    
    if (!date || !type || !student_id) {
      return res.status(400).json({
        error: 'missing_params',
        message: 'Date, type, and student ID are required'
      });
    }

    const sheets = await getGoogleSheets();

    // First get test metadata from Tests sheet
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    // Format the test_id using date and type
    const formattedDate = date.split('-').join(''); // Convert YYYY-MM-DD to YYYYMMDD
    const test_id = `${type}_${formattedDate}`;

    // Find the specific test
    const test = testsResponse.data.values?.find(row => row[0] === test_id);

    if (!test) {
      return res.status(404).json({ 
        error: 'test_not_found',
        message: 'No test found for this date and type' 
      });
    }

    // Check if test has already been submitted
    const submissionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Submissions!A2:G'
    });

    const submissions = submissionsResponse.data.values || [];
    const hasSubmitted = submissions.some(row => 
      row[0] === test_id && row[1] === student_id
    );

    if (hasSubmitted) {
      return res.status(403).json({
        error: 'already_submitted',
        message: 'You have already taken this test',
        submission: {
          test_id,
          type
        }
      });
    }

    // Get test content based on type
    let content;
    if (type === 'writing') {
      const promptsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'WritingPrompts!A2:E',
      });
      content = promptsResponse.data.values?.filter(row => row[0] === test_id);
    } else {
      const questionsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Questions!A2:I',
      });
      content = questionsResponse.data.values?.filter(row => row[0] === test_id);
    }

    if (!content || content.length === 0) {
      return res.status(404).json({
        error: 'content_not_found',
        message: 'Test content not found'
      });
    }

    return res.status(200).json({
      test_id,
      type,
      content,
      total_points: test[6]
    });

  } catch (error) {
    console.error('Error in test delivery:', error);
    return res.status(500).json({
      error: 'delivery_failed',
      message: 'Failed to deliver test'
    });
  }
}