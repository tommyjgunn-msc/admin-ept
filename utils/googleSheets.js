// utils/googleSheets.js
import { google } from 'googleapis';

export async function getGoogleSheets() {
  try {
    console.log('Initializing Google Sheets client...');
    const private_key = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
      : '';

    console.log('Credential check:', {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!private_key,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      keyLength: private_key.length
    });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: private_key
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Error in getGoogleSheets:', error);
    throw error;
  }
}

export async function verifyAdminCredentials(username, password) {
  try {
    console.log('Verifying admin credentials...');
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'AdminAuth!A2:C', // Assuming columns: Username, Password, Permissions
    });

    const rows = response.data.values || [];
    const admin = rows.find(row => row[0] === username && row[1] === password);

    if (!admin) {
      console.log('No admin found with provided credentials');
      return null;
    }

    return {
      username: admin[0],
      permissions: admin[2]
    };
  } catch (error) {
    console.error('Error verifying admin:', error);
    throw error;
  }
}

export async function recordSubmission(submissionData) {
  try {
    const sheets = await getGoogleSheets();
    const { test_id, student_id, score, completed, responses } = submissionData;

    // Format data for sheet
    const values = [[
      test_id,
      student_id,
      score.toString(),
      completed.toString(),
      JSON.stringify(responses),
      new Date().toISOString()
    ]];

    // Add to Submissions sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Submissions!A2:F',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });

    // Update test stats in Tests sheet
    await updateTestStats(test_id);

    return true;
  } catch (error) {
    console.error('Error recording submission:', error);
    throw error;
  }
}

// Helper function to update test statistics
async function updateTestStats(test_id) {
  try {
    const sheets = await getGoogleSheets();
    
    // Get all submissions for this test
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Submissions!A2:F',
    });

    const submissions = (response.data.values || [])
      .filter(row => row[0] === test_id);

    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(row => row[3] === 'true').length;
    
    // Find test row index
    const testsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tests!A2:G',
    });

    const testIndex = testsResponse.data.values.findIndex(row => row[0] === test_id);
    if (testIndex === -1) return;

    // Update submission count in test metadata
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Tests!H${testIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[totalSubmissions.toString()]]
      }
    });
  } catch (error) {
    console.error('Error updating test stats:', error);
  }
}