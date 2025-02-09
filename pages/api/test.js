// pages/api/test.js
import { getGoogleSheets } from '../../utils/googleSheets';
import { validateTestPoints } from '../../utils/pointsValidation';
import { validateTestScheduling, checkScheduleConflicts } from '../../utils/scheduleValidation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'method_not_allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const sheets = await getGoogleSheets();
    const { type, testMetadata, sections } = req.body;

    // Basic validation
    if (!type || !testMetadata || !sections) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'Type, testMetadata, and sections are required',
        received: { hasType: !!type, hasMetadata: !!testMetadata, hasSections: !!sections }
      });
    }

    // Type validation
    const validTypes = ['reading', 'listening', 'writing'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'invalid_test_type',
        message: 'Test type must be reading, listening, or writing',
        received: type
      });
    }

    // Date validation
    const testDate = new Date(testMetadata.test_date);
    if (isNaN(testDate.getTime())) {
      return res.status(400).json({
        error: 'invalid_date_format',
        message: 'Invalid test date format',
        received: testMetadata.test_date
      });
    }

    // Calculate points and validate content structure
    let totalPoints = 0;
    if (type === 'reading' || type === 'listening') {
      const hasInvalidSections = sections.some(section => 
        !section.questions || 
        !Array.isArray(section.questions) || 
        section.questions.length === 0
      );
      
      if (hasInvalidSections) {
        return res.status(400).json({
          error: 'invalid_questions',
          message: 'Each section must contain valid questions'
        });
      }

      totalPoints = sections.reduce((total, section) => {
        return total + section.questions.reduce((sectionTotal, question) => {
          return sectionTotal + (question.points || 0);
        }, 0);
      }, 0);
    } else if (type === 'writing') {
      if (sections.length > 3) {
        return res.status(400).json({
          error: 'too_many_prompts',
          message: 'Writing test cannot have more than 3 prompts',
          count: sections.length
        });
      }
      totalPoints = 50;
    }

    // Validate points and scheduling
    validateTestPoints({ type, total_points: totalPoints, content: sections });

    const scheduleValidation = validateTestScheduling({ test_date: testMetadata.test_date });
    if (!scheduleValidation.isInFuture) {
      return res.status(400).json({
        error: 'invalid_date',
        message: 'Test date must be in the future'
      });
    }

    if (!scheduleValidation.isWithinThreeWeeks) {
      return res.status(400).json({
        error: 'date_too_far',
        message: 'Test date must be within three weeks'
      });
    }

    if (!scheduleValidation.isOnValidDay) {
      return res.status(400).json({
        error: 'invalid_day',
        message: 'Tests must be scheduled on Fridays'
      });
    }

    // Check for schedule conflicts
    const conflicts = await checkScheduleConflicts(sheets, testMetadata.test_date, type);
    if (conflicts.hasConflict) {
      return res.status(409).json({
        error: 'schedule_conflict',
        message: 'A test of this type already exists on this date',
        conflicts: conflicts.conflictingTests
      });
    }

    // Generate test ID
    const test_id = `${type}_${testDate.getFullYear()}${String(testDate.getMonth() + 1).padStart(2, '0')}${String(testDate.getDate()).padStart(2, '0')}`;

    // Check if test already exists
    const existingTestResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    const existingTest = (existingTestResponse.data.values || [])
      .find(row => row[0] === test_id);

    if (existingTest) {
      return res.status(409).json({
        error: 'duplicate_test',
        message: `A test for ${type} already exists on ${testMetadata.test_date}`
      });
    }

    // Create test
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          test_id,
          type,
          testMetadata.title,
          testMetadata.description || '',
          new Date().toISOString(),
          testMetadata.test_date,
          totalPoints
        ]]
      }
    });

    // Save type-specific content
    if (type === 'reading' || type === 'listening') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Questions!A2:I',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: sections.flatMap((section, sectionIndex) =>
            section.questions.map((question, questionIndex) => [
              test_id,
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
        }
      });
    } else if (type === 'writing') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'WritingPrompts!A2:E',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: sections.map((prompt, index) => [
            test_id,
            index + 1,
            prompt.type,
            prompt.text,
            prompt.wordLimit
          ])
        }
      });
    }

    return res.status(201).json({
      message: 'Test created successfully',
      test_id
    });

  } catch (error) {
    console.error('Error creating test:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle Google Sheets specific errors
    if (error.message?.includes('Google Sheets')) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Test creation service is temporarily unavailable'
      });
    }

    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to create test',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}