// utils/scheduleValidation.js
export function validateTestScheduling(test) {
    // Parse 'YYYY-MM-DD' as a LOCAL date. Using new Date('YYYY-MM-DD') parses as
    // UTC midnight, which compared against a local "now" made today read as past
    // — that's why same-day tests were wrongly rejected.
    const [year, month, day] = String(test.test_date || '').split('-').map(Number);
    const testDate = new Date(year, (month || 1) - 1, day || 1);
    testDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validations = {
      isInFuture: testDate >= today, // allow same-day scheduling
      isOnValidDay: testDate.getDay() === 3 || testDate.getDay() === 5, // Tests run on Wednesdays and Fridays
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
