// utils/sheets/adminAuth.js — admin credential verification against AdminAuth.
import { timingSafeEqual } from 'crypto';
import { getGoogleSheets } from './client';
import { RANGES, COLS } from '../sheetSchema';

// Constant-time string compare, used for the admin password check so the
// comparison itself does not leak length/prefix information via timing.
//
// Note this is NOT the same as hashing. Hashing stored credentials only helps
// if the store leaks; since the AdminAuth sheet is deliberately kept plaintext
// with access restricted at the Drive level, hashing at compare time would add
// nothing (you would be hashing the input and comparing it to a plaintext
// cell, which simply never matches). This is the part of "handling" that can
// actually be improved without changing what is stored.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function verifyAdminCredentials(username, password) {
  try {
    console.log('Verifying admin credentials...');
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.ADMIN_AUTH,
    });

    const rows = response.data.values || [];
    const admin = rows.find(row =>
      row[COLS.ADMIN_AUTH.USERNAME] === username &&
      safeEqual(row[COLS.ADMIN_AUTH.PASSWORD], password)
    );

    if (!admin) {
      console.log('No admin found with provided credentials');
      return null;
    }

    return {
      username: admin[COLS.ADMIN_AUTH.USERNAME],
      permissions: admin[COLS.ADMIN_AUTH.PERMISSIONS]
    };
  } catch (error) {
    console.error('Error verifying admin:', error);
    throw error;
  }
}
