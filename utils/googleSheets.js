// utils/googleSheets.js — compatibility barrel over the sheets modules.
//
// The 450-line everything-file this used to be mixed the client, admin auth,
// test dates, submissions and grading in one place. The implementations now
// live in utils/sheets/* (one concern per module, column layout from
// utils/sheetSchema.js); this file re-exports them so existing import sites
// keep working unchanged. New code may import from the modules directly.

export { getGoogleSheets } from './sheets/client';
export { verifyAdminCredentials } from './sheets/adminAuth';
export {
  testDateId,
  getTestDates,
  ensureTestDatesSheet,
  createTestDate,
  updateTestDate,
  cancelTestDate,
  getAuthoredTestTypesByDate,
} from './sheets/testDates';
export {
  recordSubmission,
  getWritingSubmissions,
  getUngradedWritingSubmissions,
  saveWritingGrade,
} from './sheets/submissions';
