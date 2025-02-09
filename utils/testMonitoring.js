// utils/testMonitoring.js
export async function monitorTestExecution(testId) {
    const stats = {
      startTime: new Date(),
      submissions: 0,
      completions: 0,
      averageScore: 0,
      errors: []
    };
  
    try {
      const sheets = await getGoogleSheets();
      const testResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Submissions!A2:F'
      });
  
      const submissions = testResponse.data.values
        ?.filter(row => row[0] === testId) || [];
  
      stats.submissions = submissions.length;
      stats.completions = submissions.filter(sub => sub[3] === 'true').length;
  
      const scores = submissions
        .filter(sub => sub[3] === 'true')
        .map(sub => parseInt(sub[2]) || 0);
  
      stats.averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
  
    } catch (error) {
      stats.errors.push({
        time: new Date(),
        error: error.message
      });
    }
  
    return stats;
  }