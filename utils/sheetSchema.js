// utils/sheetSchema.js — THE definition of the EPT_Database spreadsheet layout.
//
// ⚠ MIRRORED FILE: an identical copy lives in BOTH ept-portal and admin-ept
// (the two apps share one spreadsheet but not a package). If you change one
// copy, change the other in the same sitting.
//
// Every tab, range and column index used by either app is defined here, once.
// The bug class this kills: each file re-encoding "which column is what" by
// hand (admin read Submissions!A2:F for months while ept-portal wrote A2:K,
// hiding scores and proctoring from the admin side entirely).

export const SHEETS = {
  AUTH: 'Auth',                     // student login
  ADMIN_AUTH: 'AdminAuth',          // admin login
  BOOKINGS: 'Bookings',
  TESTS: 'Tests',
  QUESTIONS: 'Questions',           // reading/listening questions
  WRITING_PROMPTS: 'WritingPrompts',
  SUBMISSIONS: 'Submissions',
  TEST_DATES: 'TestDates',          // admin-managed bookable dates
};

// Column indices (0-based, as returned by values.get).
export const COLS = {
  // Auth: A name | B email | C ept_id
  AUTH: { NAME: 0, EMAIL: 1, EPT_ID: 2 },

  // AdminAuth: A username | B password | C permissions (admin|editor|viewer)
  ADMIN_AUTH: { USERNAME: 0, PASSWORD: 1, PERMISSIONS: 2 },

  // Bookings: A name | B email | C ept_id | D has_laptop (Yes/No)
  // E date — the DISPLAY string ('Friday, 21 August'), quote-wrapped. This
  // string is the join key between bookings, capacity counts and TestDates.
  BOOKINGS: { NAME: 0, EMAIL: 1, EPT_ID: 2, HAS_LAPTOP: 3, DATE: 4 },

  // Tests: A test_id (`${type}_${YYYYMMDD}`) | B type | C title | D description
  // E created_at | F test_date (YYYY-MM-DD) | G total_points | H submission_count
  TESTS: {
    TEST_ID: 0, TYPE: 1, TITLE: 2, DESCRIPTION: 3,
    CREATED_AT: 4, TEST_DATE: 5, TOTAL_POINTS: 6, SUBMISSION_COUNT: 7,
  },

  // Questions: A test_id | B section | C question_number | D type | E points
  // F text | G options(JSON) | H correct_answer | I metadata
  QUESTIONS: {
    TEST_ID: 0, SECTION: 1, NUMBER: 2, TYPE: 3, POINTS: 4,
    TEXT: 5, OPTIONS: 6, CORRECT_ANSWER: 7, METADATA: 8,
  },

  // WritingPrompts: A test_id | B index | C type
  // (persuasive|argumentative|reflective, lowercase) | D text | E word_limit
  WRITING_PROMPTS: { TEST_ID: 0, INDEX: 1, TYPE: 2, TEXT: 3, WORD_LIMIT: 4 },

  // Submissions: A test_id | B student_id | C score | D completed | E responses(JSON)
  // F timestamp | G type | H total_points | I percentage | J proctoring_flag
  // K proctoring_data(JSON) | L ai_feedback | M grade_audit
  // ept-portal writes A..K; the AI grader adds C and L..M afterwards.
  SUBMISSIONS: {
    TEST_ID: 0, STUDENT_ID: 1, SCORE: 2, COMPLETED: 3, RESPONSES: 4,
    TIMESTAMP: 5, TYPE: 6, TOTAL_POINTS: 7, PERCENTAGE: 8,
    PROCTORING_FLAG: 9, PROCTORING_DATA: 10, AI_FEEDBACK: 11, GRADE_AUDIT: 12,
  },

  // TestDates: A id (td_YYYYMMDD) | B date_iso (YYYY-MM-DD) | C venues
  // D cap_with_laptop | E cap_without_laptop | F status
  // (published|draft|cancelled) | G updated_by | H updated_at
  TEST_DATES: {
    ID: 0, DATE_ISO: 1, VENUES: 2, CAP_WITH_LAPTOP: 3,
    CAP_WITHOUT_LAPTOP: 4, STATUS: 5, UPDATED_BY: 6, UPDATED_AT: 7,
  },
};

// Data ranges (row 1 is always the header). Named by purpose where widths
// legitimately differ; if you need a new width, add it HERE with a comment.
export const RANGES = {
  AUTH: 'Auth!A2:C',
  ADMIN_AUTH: 'AdminAuth!A2:C',
  BOOKINGS: 'Bookings!A2:E',
  TESTS: 'Tests!A2:G',
  QUESTIONS: 'Questions!A2:I',
  WRITING_PROMPTS: 'WritingPrompts!A2:E',
  TEST_DATES: 'TestDates!A2:H',
  TEST_DATES_HEADER: 'TestDates!A1:H1',

  SUBMISSIONS_PORTAL: 'Submissions!A2:K', // everything ept-portal writes
  SUBMISSIONS_FULL: 'Submissions!A2:M',   // + AI feedback and audit columns
  SUBMISSIONS_CORE: 'Submissions!A2:F',   // legacy admin append width (A..F only)
};
