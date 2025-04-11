// pages/api/duplicate-test.js
import { getGoogleSheets } from '../../utils/googleSheets';
import { validateTestScheduling } from '../../utils/scheduleValidation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'method_not_allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const sheets = await getGoogleSheets();
    const { sourceTestId, newTestDate } = req.body;

    // Basic validation
    if (!sourceTestId || !newTestDate) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'sourceTestId and newTestDate are required',
        received: { hasSourceTestId: !!sourceTestId, hasNewTestDate: !!newTestDate }
      });
    }

    // Date validation
    const testDate = new Date(newTestDate);
    if (isNaN(testDate.getTime())) {
      return res.status(400).json({
        error: 'invalid_date_format',
        message: 'Invalid test date format',
        received: newTestDate
      });
    }

    // Fetch the source test
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    const sourceTest = testsResponse.data.values.find(row => row[0] === sourceTestId);
    if (!sourceTest) {
      return res.status(404).json({
        error: 'source_test_not_found',
        message: 'Source test not found',
        testId: sourceTestId
      });
    }

    // Extract test type
    const type = sourceTest[1]; // reading, listening, or writing

    // Generate new test ID
    const test_id = `${type}_${testDate.getFullYear()}${String(testDate.getMonth() + 1).padStart(2, '0')}${String(testDate.getDate()).padStart(2, '0')}`;

    // Check if test already exists
    const existingTest = testsResponse.data.values.find(row => row[0] === test_id);
    if (existingTest) {
      return res.status(409).json({
        error: 'duplicate_test',
        message: `A test for ${type} already exists on ${newTestDate}`
      });
    }

    // Create new test record
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          test_id,
          type,
          sourceTest[2], // title
          sourceTest[3], // description
          new Date().toISOString(), // created_at (current time)
          newTestDate,
          sourceTest[6] // total_points
        ]]
      }
    });

    // Duplicate content based on test type
    if (type === 'reading' || type === 'listening') {
      // Get source test questions
      const questionsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Questions!A2:I',
      });

      const sourceQuestions = questionsResponse.data.values
        .filter(row => row[0] === sourceTestId);

      if (sourceQuestions.length > 0) {
        // Update test_id in all question records
        const newQuestions = sourceQuestions.map(question => [
          test_id,
          question[1], // section index
          question[2], // section title
          question[3], // section content
          question[4], // question index
          question[5], // question text
          question[6], // options JSON
          question[7], // correct answer
          question[8]  // points
        ]);

        // Add questions for new test
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Questions!A2:I',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: newQuestions }
        });
      }
    } else if (type === 'writing') {
      // Get source test prompts
      const promptsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'WritingPrompts!A2:E',
      });

      const sourcePrompts = promptsResponse.data.values
        .filter(row => row[0] === sourceTestId);

      if (sourcePrompts.length > 0) {
        // Update test_id in all prompt records
        const newPrompts = sourcePrompts.map(prompt => [
          test_id,
          prompt[1], // prompt index
          prompt[2], // type
          prompt[3], // text
          prompt[4]  // word limit
        ]);

        // Add prompts for new test
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'WritingPrompts!A2:E',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: newPrompts }
        });
      }
    }

    return res.status(201).json({
      message: 'Test duplicated successfully',
      original_id: sourceTestId,
      new_id: test_id,
      type,
      test_date: newTestDate
    });

  } catch (error) {
    console.error('Error duplicating test:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle Google Sheets specific errors
    if (error.message?.includes('Google Sheets')) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Test duplication service is temporarily unavailable'
      });
    }

    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to duplicate test',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
