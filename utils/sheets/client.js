// utils/sheets/client.js — the one Google Sheets client for admin-ept.
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
