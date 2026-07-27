// utils/sheets/results.js — student results, joined to real names and grouped
// by test date.
//
// Submissions store student_id (the EPT ID) but not the student's name; the
// Auth tab holds Name | Email | EPTID. This module joins the two so results
// can be read by a human, and buckets them per sitting.
import { getGoogleSheets } from './client';
import { RANGES, COLS } from '../sheetSchema';

const S = COLS.SUBMISSIONS;
const A = COLS.AUTH;
const T = COLS.TESTS;

export const SECTIONS = ['reading', 'writing', 'listening'];

// Used only when neither the submission nor the Tests row carries a total.
const FALLBACK_TOTALS = { reading: 30, writing: 50, listening: 20 };

/** 'reading_20260821' -> '2026-08-21' (null when the id has no date suffix). */
export function testIdToIso(testId) {
  const match = String(testId || '').match(/_(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function toDisplayDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Scores arrive as strings and are not always numeric: an ungraded writing
 * script is blank, and the grader writes 'Review needed' when it cannot read a
 * mark out of the model's prose. Neither should be silently counted as zero.
 */
function parseScore(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { value: null, state: 'ungraded' };
  const number = Number(text);
  if (Number.isFinite(number)) return { value: number, state: 'scored' };
  return { value: null, state: 'review' };
}

export async function getResultsByDate() {
  const sheets = await getGoogleSheets();

  const [submissionsRes, authRes, testsRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.SUBMISSIONS_FULL,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.AUTH,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGES.TESTS,
    }),
  ]);

  // EPT ID -> student identity.
  const students = new Map();
  for (const row of authRes.data.values || []) {
    const eptId = String(row[A.EPT_ID] || '').trim();
    if (eptId) {
      students.set(eptId, {
        name: String(row[A.NAME] || '').trim(),
        email: String(row[A.EMAIL] || '').trim(),
      });
    }
  }

  // test_id -> authoritative total, for sections whose submission row has none
  // (writing rows are written without a total).
  const testTotals = new Map();
  for (const row of testsRes.data.values || []) {
    const id = String(row[T.TEST_ID] || '').trim();
    const total = Number(row[T.TOTAL_POINTS]);
    if (id && Number.isFinite(total) && total > 0) testTotals.set(id, total);
  }

  // date -> student_id -> record
  const byDate = new Map();

  for (const row of submissionsRes.data.values || []) {
    const testId = String(row[S.TEST_ID] || '').trim();
    const iso = testIdToIso(testId);
    if (!iso) continue;

    const studentId = String(row[S.STUDENT_ID] || '').trim();
    if (!studentId) continue;

    const section = String(row[S.TYPE] || testId.split('_')[0] || '').toLowerCase();
    if (!SECTIONS.includes(section)) continue;

    const submittedAt = String(row[S.TIMESTAMP] || '');
    const { value, state } = parseScore(row[S.SCORE]);

    const rowTotal = Number(row[S.TOTAL_POINTS]);
    const total = Number.isFinite(rowTotal) && rowTotal > 0
      ? rowTotal
      : (testTotals.get(testId) || FALLBACK_TOTALS[section]);

    if (!byDate.has(iso)) byDate.set(iso, new Map());
    const dateBucket = byDate.get(iso);

    if (!dateBucket.has(studentId)) {
      const identity = students.get(studentId);
      dateBucket.set(studentId, {
        student_id: studentId,
        name: identity?.name || '',
        email: identity?.email || '',
        // Flagged so the UI can show that a submission has no matching Auth row
        // rather than rendering a nameless entry that looks like a bug.
        unknownStudent: !identity,
        sections: {},
      });
    }

    const record = dateBucket.get(studentId);
    const existing = record.sections[section];
    const flagged = String(row[S.PROCTORING_FLAG] || '').toUpperCase() === 'YES';

    // A retake writes a second row for the same section; the mark shown is the
    // latest by submission time. (Comparing timestamps, not row order — the
    // sheet is append-ordered but that is not a guarantee to lean on.)
    //
    // The proctoring flag is sticky across attempts: it records that something
    // happened during the sitting, so a clean retake must not erase a flag
    // raised on an earlier one.
    const attempts = existing ? existing.attempts + 1 : 1;
    const flagSoFar = flagged || Boolean(existing?.flagged);

    if (existing && existing.submittedAt > submittedAt) {
      existing.attempts = attempts;
      existing.flagged = flagSoFar;
      continue;
    }

    record.sections[section] = {
      score: value,
      state,
      total,
      percentage: value !== null && total > 0 ? Math.round((value / total) * 100) : null,
      submittedAt,
      flagged: flagSoFar,
      attempts,
    };
  }

  // Shape into sorted arrays, newest sitting first.
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([iso, studentMap]) => {
      const studentsOut = [...studentMap.values()].map(record => {
        let earned = 0;
        let possible = 0;
        let complete = true;

        for (const section of SECTIONS) {
          const entry = record.sections[section];
          if (!entry || entry.state !== 'scored') { complete = false; continue; }
          earned += entry.score;
          possible += entry.total;
        }

        return {
          ...record,
          totalScore: earned,
          totalPossible: possible,
          overallPercentage: possible > 0 ? Math.round((earned / possible) * 100) : null,
          complete,
          needsReview: SECTIONS.some(s => record.sections[s]?.state === 'review'),
          anyFlagged: SECTIONS.some(s => record.sections[s]?.flagged),
        };
      })
        .sort((a, b) => (a.name || a.student_id).localeCompare(b.name || b.student_id));

      return {
        date_iso: iso,
        date_label: toDisplayDate(iso),
        students: studentsOut,
        summary: {
          students: studentsOut.length,
          complete: studentsOut.filter(s => s.complete).length,
          needsReview: studentsOut.filter(s => s.needsReview).length,
          flagged: studentsOut.filter(s => s.anyFlagged).length,
          averagePercentage: (() => {
            const scored = studentsOut.filter(s => s.overallPercentage !== null && s.complete);
            if (!scored.length) return null;
            return Math.round(scored.reduce((n, s) => n + s.overallPercentage, 0) / scored.length);
          })(),
        },
      };
    });
}

/** Submission counts per test_id, computed live from the Submissions tab. */
export async function getSubmissionCounts() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: RANGES.SUBMISSIONS_PORTAL,
  });

  const counts = {};
  for (const row of response.data.values || []) {
    const testId = String(row[S.TEST_ID] || '').trim();
    if (testId) counts[testId] = (counts[testId] || 0) + 1;
  }
  return counts;
}
