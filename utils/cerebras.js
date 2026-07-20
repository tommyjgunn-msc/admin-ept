// utils/cerebras.js — Cerebras inference client for writing-test grading.
//
// Replaces the Apps Script grader that lived on the sheet and called
// OpenRouter with a hardcoded key. The key now lives in the CEREBRAS_API
// environment variable and never touches the spreadsheet.
//
// Cerebras exposes an OpenAI-compatible chat completions endpoint.

const API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// zai-glm-4.7 and gpt-oss-120b are the models available on the account.
// Override with CEREBRAS_MODEL without a redeploy of this file's logic.
const DEFAULT_MODEL = 'zai-glm-4.7';

// Free-tier context is modest; a 500-word essay is ~700 tokens, so this only
// ever trims pathological submissions rather than real ones.
const MAX_ESSAY_CHARS = 24000;

export const SYSTEM_PROMPT =
  'You are an English Langauge tutor, currently tasked with grading English ' +
  'Proficiency Writing tests. Your job is to evaluate how will written each ' +
  'piece of writing is, based on the following CEFR standards: Organisation, ' +
  'Language, Content, Coherence, Relevance, Appropriacy of Response, and ' +
  'Structure. The writing prompt received was to produce a piece of writing ' +
  'that is 500 words long and either Reflective, Argumentative, or Persuasive. ' +
  'Be fair but critical as submissions are predominantly by ESL speakers. ' +
  'Provide a final grade out of 50';

export function getModel() {
  return process.env.CEREBRAS_MODEL || DEFAULT_MODEL;
}

export function hasApiKey() {
  return Boolean(process.env.CEREBRAS_API || process.env.CEREBRAS_API_KEY);
}

/**
 * Send one submission to Cerebras for grading.
 * Returns the raw assistant text; score extraction is a separate concern.
 */
export async function gradeSubmission(essay, { timeoutMs = 60000 } = {}) {
  const apiKey = process.env.CEREBRAS_API || process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    const error = new Error('CEREBRAS_API is not set');
    error.code = 'missing_api_key';
    throw error;
  }

  const text = String(essay || '').slice(0, MAX_ESSAY_CHARS);
  if (!text.trim()) {
    const error = new Error('Submission is empty');
    error.code = 'empty_submission';
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.2, // grading should be as repeatable as we can make it
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const error = new Error(
      err.name === 'AbortError' ? 'Cerebras request timed out' : `Cerebras request failed: ${err.message}`
    );
    error.code = 'network_error';
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    const error = new Error('Cerebras rate limit reached. Slow down and retry.');
    error.code = 'rate_limited';
    error.retryAfter = Number(response.headers.get('retry-after')) || null;
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Cerebras returned ${response.status}`);
    error.code = 'api_error';
    error.detail = detail.slice(0, 500);
    throw error;
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error('Cerebras returned no content');
    error.code = 'empty_response';
    throw error;
  }

  return content;
}

/**
 * Pull a mark out of 50 from the model's prose.
 * Patterns carried over from the Apps Script grader this replaces.
 * Returns null when nothing trustworthy is found, so the caller can flag the
 * row for manual review rather than inventing a score.
 */
export function extractScore(text) {
  // Models phrase the mark as "38/50", "38 / 50" or "38 out of 50" more or
  // less interchangeably. The Apps Script version only understood the slash
  // forms, so any "out of 50" answer fell through to manual review.
  const OUT_OF_50 = String.raw`(\d{1,2})\s*(?:\/|out\s+of)\s*50`;

  const patterns = [
    new RegExp(String.raw`final\s+grade\D{0,20}` + OUT_OF_50, 'i'),
    new RegExp(String.raw`grade\D{0,20}` + OUT_OF_50, 'i'),
    new RegExp(String.raw`score\D{0,20}` + OUT_OF_50, 'i'),
    new RegExp(OUT_OF_50, 'i'),
    /final\s+grade\D{0,20}(\d{1,2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (Number.isInteger(score) && score >= 0 && score <= 50) return score;
    }
  }
  return null;
}

/**
 * Extract the essay text from the JSON blob stored in Submissions column E.
 * ept-portal stores writing responses as an object keyed by prompt id.
 */
export function extractEssay(rawResponses) {
  if (!rawResponses) return '';

  let parsed;
  try {
    parsed = JSON.parse(rawResponses);
  } catch {
    return String(rawResponses).trim();
  }

  if (typeof parsed === 'string') return parsed.trim();
  if (Array.isArray(parsed)) {
    return parsed.filter(v => typeof v === 'string').join('\n\n').trim();
  }
  if (parsed && typeof parsed === 'object') {
    return Object.values(parsed).filter(v => typeof v === 'string').join('\n\n').trim();
  }
  return '';
}
