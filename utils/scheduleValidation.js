// utils/scheduleValidation.js
export function validateTestScheduling(test) {
    const testDate = new Date(test.test_date);
    const now = new Date();
    const threeWeeksFromNow = new Date();
    threeWeeksFromNow.setDate(now.getDate() + 21);
  
    const validations = {
      isInFuture: testDate > now,
      isWithinThreeWeeks: testDate <= threeWeeksFromNow,
      isOnValidDay: testDate.getDay() === 5, // Friday
      hasNoConflicts: true // We'll check this against existing tests
    };
  
    return validations;
  }
  
  export async function checkScheduleConflicts(sheets, testDate, testType) {
    // Check for existing tests on the same date
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });
  
    const existingTests = testsResponse.data.values
      ?.filter(row => row[5] === testDate && row[1] === testType) || [];
  
    return {
      hasConflict: existingTests.length > 0,
      conflictingTests: existingTests.map(test => ({
        test_id: test[0],
        type: test[1],
        title: test[2]
      }))
    };
  }