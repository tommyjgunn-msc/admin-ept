// pages/api/tests/[testId].js
import { getGoogleSheets } from '../../../utils/googleSheets';

// Helper functions
async function updateWritingPrompts(sheets, testId, prompts) {
  // First, get existing prompts
  const promptsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'WritingPrompts!A2:E',
  });

  // Filter out old prompts for this test and add new ones
  const otherPrompts = promptsResponse.data.values?.filter(row => row[0] !== testId) || [];
  const updatedPrompts = [
    ...otherPrompts,
    ...prompts.map((prompt, index) => [
      testId,
      index + 1,
      prompt.type,
      prompt.text,
      prompt.wordLimit
    ])
  ];

  // Clear and rewrite the prompts
  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'WritingPrompts!A2:E',
  });

  if (updatedPrompts.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'WritingPrompts!A2',
      valueInputOption: 'RAW',
      requestBody: { values: updatedPrompts }
    });
  }
}

async function updateQuestions(sheets, testId, sections) {
  // First, get existing questions
  const questionsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Questions!A2:I',
  });

  // Filter out old questions for this test and add new ones
  const otherQuestions = questionsResponse.data.values?.filter(row => row[0] !== testId) || [];
  const updatedQuestions = [
    ...otherQuestions,
    ...sections.flatMap((section, sectionIndex) => 
      section.questions.map((question, questionIndex) => [
        testId,
        sectionIndex + 1,
        section.title,
        section.content || '',
        questionIndex + 1,
        question.text,
        JSON.stringify(question.options),
        question.correctAnswer,
        question.points
      ])
    )
  ];

  // Clear and rewrite the questions
  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Questions!A2:I',
  });

  if (updatedQuestions.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Questions!A2',
      valueInputOption: 'RAW',
      requestBody: { values: updatedQuestions }
    });
  }
}

export default async function handler(req, res) {
  const { testId } = req.query;

  if (!testId) {
    return res.status(400).json({
      error: 'missing_test_id',
      message: 'Test ID is required'
    });
  }

  try {
    const sheets = await getGoogleSheets();

    switch (req.method) {
      case 'GET': {
        try {
          const testsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Tests!A2:G',
          });

          const test = testsResponse.data.values
            .find(row => row[0] === testId);

          if (!test) {
            return res.status(404).json({
              error: 'test_not_found',
              message: 'Test not found',
              testId
            });
          }

          // Fetch test content based on type
          let content = [];
          const type = test[1];

          if (type === 'writing') {
            const promptsResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'WritingPrompts!A2:E',
            });
            content = promptsResponse.data.values
              ?.filter(row => row[0] === testId) || [];
          } else if (type === 'reading' || type === 'listening') {
            const questionsResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'Questions!A2:I',
            });
            content = questionsResponse.data.values
              ?.filter(row => row[0] === testId) || [];
          }

          return res.status(200).json({
            test_id: test[0],
            type: test[1],
            title: test[2],
            description: test[3],
            created_at: test[4],
            test_date: test[5],
            total_points: test[6],
            content
          });
        } catch (contentError) {
          console.error('Error fetching test content:', contentError);
          return res.status(500).json({
            error: 'content_fetch_error',
            message: 'Failed to fetch test content'
          });
        }
      }

      case 'PUT': {
        try {
          const { type, title, description, test_date, content } = req.body;

          // Validate required fields
          if (!type || !title || !test_date || !content) {
            return res.status(400).json({
              error: 'missing_required_fields',
              message: 'Missing required fields',
              required: ['type', 'title', 'test_date', 'content']
            });
          }

          const validTypes = ['reading', 'listening', 'writing'];
          if (!validTypes.includes(type)) {
            return res.status(400).json({
              error: 'invalid_test_type',
              message: 'Invalid test type',
              received: type,
              valid: validTypes
            });
          }

          // Update test metadata
          const testsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Tests!A2:G',
          });

          const testIndex = testsResponse.data.values.findIndex(row => row[0] === testId);
          if (testIndex === -1) {
            return res.status(404).json({
              error: 'test_not_found',
              message: 'Test not found',
              testId
            });
          }

          // Calculate total points based on content
          const totalPoints = type === 'writing' ? 50 : content.reduce((sum, item) => 
            sum + (parseInt(item.points) || 0), 0);

          // Update test metadata
          const updatedTest = [
            testId,
            type,
            title,
            description,
            testsResponse.data.values[testIndex][4], // Keep original created_at
            test_date,
            totalPoints
          ];

          // Update the test
          await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Tests!A${testIndex + 2}:G${testIndex + 2}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [updatedTest]
            }
          });

          // Update content based on type
          if (type === 'writing') {
            await updateWritingPrompts(sheets, testId, content);
          } else {
            await updateQuestions(sheets, testId, content);
          }

          return res.status(200).json({
            message: 'Test updated successfully',
            test: {
              test_id: testId,
              type,
              title,
              description,
              test_date,
              total_points: totalPoints,
              content
            }
          });
        } catch (updateError) {
          console.error('Error updating test:', updateError);
          return res.status(500).json({
            error: 'update_failed',
            message: 'Failed to update test content'
          });
        }
      }

      case 'DELETE': {
        try {
          // Check if test exists
          const testsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Tests!A2:G',
          });

          const testExists = testsResponse.data.values.some(row => row[0] === testId);
          if (!testExists) {
            return res.status(404).json({
              error: 'test_not_found',
              message: 'Test not found',
              testId
            });
          }

          // Delete from Tests sheet
          const newValues = testsResponse.data.values.filter(row => row[0] !== testId);
          await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Tests!A2:G',
          });

          if (newValues.length > 0) {
            await sheets.spreadsheets.values.append({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'Tests!A2',
              valueInputOption: 'RAW',
              requestBody: { values: newValues }
            });
          }

          // Delete related content
          const testType = testsResponse.data.values.find(row => row[0] === testId)?.[1];
          if (testType === 'writing') {
            const promptsResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'WritingPrompts!A2:E',
            });
            const newPrompts = promptsResponse.data.values?.filter(row => row[0] !== testId) || [];
            
            await sheets.spreadsheets.values.clear({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'WritingPrompts!A2:E',
            });

            if (newPrompts.length > 0) {
              await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'WritingPrompts!A2',
                valueInputOption: 'RAW',
                requestBody: { values: newPrompts }
              });
            }
          } else if (testType === 'reading' || testType === 'listening') {
            const questionsResponse = await sheets.spreadsheets.values.get({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'Questions!A2:I',
            });
            const newQuestions = questionsResponse.data.values?.filter(row => row[0] !== testId) || [];
            
            await sheets.spreadsheets.values.clear({
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              range: 'Questions!A2:I',
            });

            if (newQuestions.length > 0) {
              await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Questions!A2',
                valueInputOption: 'RAW',
                requestBody: { values: newQuestions }
              });
            }
          }

          return res.status(200).json({
            message: 'Test deleted successfully'
          });

        } catch (deleteError) {
          console.error('Error deleting test:', deleteError);
          return res.status(500).json({
            error: 'delete_failed',
            message: 'Failed to delete test completely'
          });
        }
      }

      default:
        return res.status(405).json({
          error: 'method_not_allowed',
          message: 'Method not allowed',
          allowed: ['GET', 'PUT', 'DELETE']
        });
    }

  } catch (error) {
    console.error('Error handling test operation:', {
      method: req.method,
      testId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message?.includes('Google Sheets')) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Test service is temporarily unavailable'
      });
    }

    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}