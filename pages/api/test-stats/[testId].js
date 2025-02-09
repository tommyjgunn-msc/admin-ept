// pages/api/test-stats/[testId].js
import { getGoogleSheets } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  const { testId } = req.query;

  // Validate testId is present
  if (!testId) {
    return res.status(400).json({
      error: 'missing_test_id', 
      message: 'Test ID is required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    const sheets = await getGoogleSheets();

    // Get test details first 
    const testResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    const test = testResponse.data.values.find(row => row[0] === testId);
    if (!test) {
      return res.status(404).json({
        error: 'test_not_found',
        message: 'Test not found',
        testId
      });
    }

    // Get all submissions for this test
    try {
      const submissionsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Submissions!A2:F', // test_id, student_id, score, completed, responses, timestamp
      });

      const submissions = (submissionsResponse.data.values || [])
        .filter(row => row[0] === testId);

      // Calculate basic statistics
      const totalSubmissions = submissions.length;
      const completedSubmissions = submissions.filter(row => row[3] === 'true').length;
      const scores = submissions.map(row => parseInt(row[2]) || 0);
      
      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      
      const completionRate = totalSubmissions > 0
        ? Math.round((completedSubmissions / totalSubmissions) * 100)
        : 0;

      // Calculate score distribution
      const scoreRanges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        'below-60': 0
      };

      scores.forEach(score => {
        if (score >= 90) scoreRanges['90-100']++;
        else if (score >= 80) scoreRanges['80-89']++;
        else if (score >= 70) scoreRanges['70-79']++;
        else if (score >= 60) scoreRanges['60-69']++;
        else scoreRanges['below-60']++;
      });

      // Convert to percentages
      Object.keys(scoreRanges).forEach(range => {
        scoreRanges[range] = Math.round((scoreRanges[range] / scores.length) * 100) || 0;
      });

      // Base response data
      const responseData = {
        totalSubmissions,
        averageScore,
        completionRate,
        scoreRanges
      };

      // Add question stats only for reading/listening tests
      if (test[1] !== 'writing') {
        try {
          const questionsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Questions!A2:I',
          });

          const testQuestions = questionsResponse.data.values
            .filter(row => row[0] === testId)
            .map(question => ({
              text: question[5],
              correctAnswer: question[7]
            }));

          const questionStats = testQuestions.map((question, index) => {
            const questionResponses = submissions
              .filter(sub => sub[3] === 'true') // Only completed submissions
              .map(sub => JSON.parse(sub[4] || '[]')[index]); // Parse responses JSON

            const correctCount = questionResponses
              .filter(response => response === question.correctAnswer).length;

            return {
              text: question.text,
              correctPercentage: questionResponses.length > 0
                ? Math.round((correctCount / questionResponses.length) * 100)
                : 0,
              totalAttempts: questionResponses.length
            };
          });

          responseData.questionStats = questionStats;
        } catch (questionsError) {
          console.error('Error fetching question statistics:', questionsError);
          // Continue without question stats rather than failing completely
          responseData.questionStats = [];
          responseData.questionStatsError = 'Failed to fetch question statistics';
        }
      }

      return res.status(200).json(responseData);

    } catch (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return res.status(500).json({
        error: 'submissions_fetch_error',
        message: 'Failed to fetch test submissions'
      });
    }

  } catch (error) {
    console.error('Error fetching test statistics:', {
      testId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    if (error.message?.includes('Google Sheets')) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Statistics service is temporarily unavailable'
      });
    }

    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to fetch test statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}