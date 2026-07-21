// utils/cerebras.js — Cerebras inference client for writing-test grading and
// writing-prompt generation.
//
// Replaces the Apps Script grader that lived on the sheet and called
// OpenRouter with a hardcoded key. The key now lives in the CEREBRAS_API
// environment variable and never touches the spreadsheet.
//
// Cerebras exposes an OpenAI-compatible chat completions endpoint.

const API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// Cerebras serves gpt-oss-120b (production), gemma-4-31b (preview) and
// zai-glm-4.7 (preview) on this account. Default to the production model:
// zai-glm-4.7 is flagged for deprecation on 2026-08-17, which is inside the
// window this grader is meant to run in, and a preview model can change under
// us mid-marking-season.
// Override with CEREBRAS_MODEL to try another without touching this file.
const DEFAULT_MODEL = 'gpt-oss-120b';

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
 * One chat-completion round trip. Shared by grading and prompt generation so
 * error handling (timeouts, rate limits, empty responses) lives in one place.
 * Returns the assistant's text.
 */
export async function chatCompletion(messages, { timeoutMs = 60000, temperature = 0.2 } = {}) {
  const apiKey = process.env.CEREBRAS_API || process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    const error = new Error('CEREBRAS_API is not set');
    error.code = 'missing_api_key';
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
        messages,
        temperature,
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
 * Send one submission to Cerebras for grading.
 * Returns the raw assistant text; score extraction is a separate concern.
 */
export async function gradeSubmission(essay, { timeoutMs = 60000 } = {}) {
  const text = String(essay || '').slice(0, MAX_ESSAY_CHARS);
  if (!text.trim()) {
    const error = new Error('Submission is empty');
    error.code = 'empty_submission';
    throw error;
  }

  return chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    // grading should be as repeatable as we can make it
    { timeoutMs, temperature: 0.2 }
  );
}

/* ------------------------------------------------------------------ *
 * Writing-prompt generation.
 *
 * The writing test always offers three prompts — one persuasive, one
 * argumentative, one reflective — and the student picks one and writes at
 * least 500 words. Generation follows the established house style:
 * a concrete task, a "Consider …" clause naming angles to weigh, and an
 * explicit 500-word instruction.
 * ------------------------------------------------------------------ */

export const PROMPT_TYPES = ['persuasive', 'argumentative', 'reflective'];

const GENERATION_SYSTEM_PROMPT =
  'You write prompts for an English proficiency writing test taken mostly by ' +
  'ESL university applicants. Produce exactly three essay prompts: one ' +
  'persuasive, one argumentative, one reflective. House style, matching these ' +
  'examples: "Write a persuasive essay arguing for or against requiring all ' +
  'new residential buildings to install solar panels. Consider installation ' +
  'costs, long-term energy savings, and environmental impact. Write at least ' +
  '500 words." — a concrete, culturally neutral topic a young adult anywhere ' +
  'can engage with; a Consider-sentence naming two or three angles; and a ' +
  'closing instruction to write at least 500 words in that essay mode. ' +
  'Reflective prompts ask about personal experience rather than public issues. ' +
  'Avoid topics needing specialist or country-specific knowledge. ' +
  'Respond with ONLY this JSON, no markdown fences, no commentary: ' +
  '{"prompts":[{"type":"persuasive","text":"..."},{"type":"argumentative",' +
  '"text":"..."},{"type":"reflective","text":"..."}]}';

/**
 * Generate the three writing prompts, optionally steered by a theme.
 * Returns [{ type, text, wordLimit: 500 }] in persuasive/argumentative/
 * reflective order, shaped exactly like the create-test editor's state.
 */
export async function generateWritingPrompts(theme, { timeoutMs = 60000 } = {}) {
  const hint = String(theme || '').trim().slice(0, 300);
  const userMessage = hint
    ? `Generate the three prompts. Theme or topic area to draw on: ${hint}`
    : 'Generate the three prompts. Choose fresh, varied topic areas.';

  const raw = await chatCompletion(
    [
      { role: 'system', content: GENERATION_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    // variety is the point here, unlike grading
    { timeoutMs, temperature: 0.8 }
  );

  // Models fence or preface JSON despite instructions; dig the object out.
  let parsed;
  try {
    const stripped = raw.replace(/```(?:json)?/gi, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    parsed = JSON.parse(start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped);
  } catch {
    const error = new Error('The model did not return usable JSON — try again');
    error.code = 'bad_generation';
    error.detail = raw.slice(0, 300);
    throw error;
  }

  const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
  const byType = new Map(
    prompts
      .filter(p => p && typeof p.text === 'string')
      .map(p => [String(p.type || '').toLowerCase().trim(), p.text.trim()])
  );

  const missing = PROMPT_TYPES.filter(type => !byType.get(type) || byType.get(type).length < 40);
  if (missing.length > 0) {
    const error = new Error(`The model's response was missing a usable ${missing.join(' and ')} prompt — try again`);
    error.code = 'bad_generation';
    throw error;
  }

  // wordLimit 500 matches the editor's default for hand-written prompts.
  return PROMPT_TYPES.map(type => ({ type, text: byType.get(type), wordLimit: 500 }));
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
