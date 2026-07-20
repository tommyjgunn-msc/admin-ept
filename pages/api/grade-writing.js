// pages/api/grade-writing.js — AI grading for writing submissions.
//
// Replaces the Apps Script grader that ran on the spreadsheet with a
// hardcoded OpenRouter key. The Cerebras key lives in CEREBRAS_API here and
// is never exposed to the browser.
//
// Deliberately grades ONE submission per request. The Cerebras free tier is
// about 5 requests/minute and serverless functions time out in seconds, so a
// server-side "grade everything" loop could not finish. The admin page paces
// the calls instead, which also makes the run resumable and interruptible.
import {
  getWritingSubmissions,
  getUngradedWritingSubmissions,
  saveWritingGrade,
} from '../../utils/googleSheets';
import {
  gradeSubmission,
  extractScore,
  extractEssay,
  getModel,
  hasApiKey,
} from '../../utils/cerebras';
import { withAdminAuth } from '../../utils/withAdminAuth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const all = await getWritingSubmissions();
    const pending = all.filter(entry => entry.score === '');

    return res.status(200).json({
      model: getModel(),
      apiKeyConfigured: hasApiKey(),
      total: all.length,
      graded: all.length - pending.length,
      pending: pending.length,
      // Full queue, so the client can walk it explicitly and step over a row
      // it could not grade instead of asking for "the next one" forever.
      next: pending.map(entry => ({
        rowNumber: entry.rowNumber,
        test_id: entry.test_id,
        student_id: entry.student_id,
      })),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!hasApiKey()) {
    return res.status(503).json({
      error: 'missing_api_key',
      message: 'CEREBRAS_API is not set on this deployment.',
    });
  }

  const pending = await getUngradedWritingSubmissions();
  if (pending.length === 0) {
    return res.status(200).json({ done: true, message: 'No ungraded writing submissions', remaining: 0 });
  }

  // Grade a specific row when the client names one, otherwise take the next.
  const requestedRow = Number(req.body?.rowNumber);
  const target = requestedRow
    ? pending.find(entry => entry.rowNumber === requestedRow)
    : pending[0];

  if (!target) {
    return res.status(200).json({
      skipped: true,
      message: 'That submission is already graded',
      remaining: pending.length,
    });
  }

  const essay = extractEssay(target.responses);
  if (!essay) {
    return res.status(422).json({
      error: 'empty_submission',
      message: `${target.student_id} submitted no writing`,
      rowNumber: target.rowNumber,
      student_id: target.student_id,
      remaining: pending.length,
    });
  }

  let feedback;
  try {
    feedback = await gradeSubmission(essay);
  } catch (error) {
    const status = error.code === 'rate_limited' ? 429 : 502;
    return res.status(status).json({
      error: error.code || 'grading_failed',
      message: error.message,
      retryAfter: error.retryAfter || null,
      rowNumber: target.rowNumber,
      student_id: target.student_id,
      remaining: pending.length,
    });
  }

  const score = extractScore(feedback);
  if (score === null) {
    // Never invent a mark. Record the feedback so it can be read by hand.
    return res.status(422).json({
      error: 'score_not_found',
      message: `Could not read a mark out of 50 for ${target.student_id}. Needs manual review.`,
      feedback,
      rowNumber: target.rowNumber,
      student_id: target.student_id,
      remaining: pending.length,
    });
  }

  try {
    await saveWritingGrade(target.rowNumber, { score, feedback, model: getModel() });
  } catch (error) {
    if (error.code === 'already_graded') {
      return res.status(200).json({
        skipped: true,
        message: `${target.student_id} was already graded`,
        remaining: pending.length - 1,
      });
    }
    throw error;
  }

  return res.status(200).json({
    graded: {
      rowNumber: target.rowNumber,
      test_id: target.test_id,
      student_id: target.student_id,
      score,
      wordCount: essay.trim().split(/\s+/).length,
    },
    remaining: pending.length - 1,
  });
}

export default withAdminAuth(handler);
