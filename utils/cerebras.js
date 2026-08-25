// utils/cerebras.js — OpenAI-compatible inference client for writing-test
// grading and writing-prompt generation. Provider-agnostic despite the
// filename; it started on Cerebras and now runs wherever LLM_BASE_URL points.
//
// Replaces the Apps Script grader that lived on the sheet and called
// OpenRouter with a hardcoded key. The key now lives in the LLM_API_KEY
// environment variable and never touches the spreadsheet.
//
// Cerebras exposes an OpenAI-compatible chat completions endpoint -- and so do
// Groq, OpenRouter, Together, and Gemini's compatibility layer. The base URL
// lives in an env var so moving provider is a Vercel setting rather than a
// commit. When Cerebras retired its free tier on 2026-08-17, this one hardcoded
// line is what turned their pricing decision into our outage.
//
//   Groq:      LLM_BASE_URL=https://api.groq.com/openai/v1
//              LLM_MODEL=openai/gpt-oss-120b
//   Cerebras:  LLM_BASE_URL=https://api.cerebras.ai/v1   (the default)
//
// Whatever the provider, the model must still phrase its mark as "n/50" or
// "n out of 50" or extractScore() below will not find it.
const DEFAULT_BASE_URL = 'https://api.cerebras.ai/v1';

function getBaseUrl() {
  const base = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  return base.trim().replace(/\/+$/, '');
}

function getApiUrl() {
  return `${getBaseUrl()}/chat/completions`;
}

// Names the host in error messages, so a rejection says which provider did the
// rejecting. Sending a Groq key to Cerebras returns a 401 that reads exactly
// like a bad key, and the message never used to say where it came from.
function providerName() {
  try {
    return new URL(getBaseUrl()).hostname.replace(/^api\./, '');
  } catch {
    return 'inference API';
  }
}

// gpt-oss-120b is the model extractScore() below was tuned against: it phrases
// its verdict as "n/50" or "n out of 50", which the regex depends on. Groq
// serves the same weights as openai/gpt-oss-120b. Prefer a production model
// over a preview one -- a preview can be deprecated mid-marking-season, as
// zai-glm-4.7 was on 2026-08-17.
// Override with LLM_MODEL, but grade one real essay afterwards and confirm a
// mark still comes back: a different family phrases things differently, and a
// missed mark sends every submission to manual review.
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
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

// The trim matters: a key pasted into a dashboard often arrives with a trailing
// newline or wrapped in quotes, which makes a malformed Authorization header and
// comes back as a 401 that is indistinguishable from a genuinely wrong key.
export function getApiKey() {
  const key = process.env.LLM_API_KEY || '';
  return key.trim().replace(/^['"]|['"]$/g, '');
}

export function hasApiKey() {
  return Boolean(getApiKey());
}

/**
 * One chat-completion round trip. Shared by grading and prompt generation so
 * error handling (timeouts, rate limits, empty responses) lives in one place.
 * Returns the assistant's text.
 */
export async function chatCompletion(messages, { timeoutMs = 60000, temperature = 0.2 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('LLM_API_KEY is not set');
    error.code = 'missing_api_key';
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(getApiUrl(), {
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
      err.name === 'AbortError'
        ? `${providerName()} request timed out`
        : `${providerName()} request failed: ${err.message}`
    );
    error.code = 'network_error';
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    const error = new Error(`${providerName()} rate limit reached. Slow down and retry.`);
    error.code = 'rate_limited';
    error.retryAfter = Number(response.headers.get('retry-after')) || null;
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');

    // Cerebras answers failures with an OpenAI-shaped JSON body that says why.
    // Carry that sentence into the message: it is the only thing that reaches
    // the admin page, which shows error.message and nothing else. A bare
    // "Cerebras returned 402" cost an afternoon of key-swapping when the key
    // was never the problem (402 is billing; a bad key is a 401).
    let reason = '';
    try {
      const body = JSON.parse(detail);
      reason = body?.error?.message || body?.message || '';
    } catch {
      reason = detail.slice(0, 200).trim();
    }

    const error = new Error(
      reason
        ? `${providerName()} returned ${response.status}: ${reason}`
        : `${providerName()} returned ${response.status}`
    );
    error.code = response.status === 402 ? 'payment_required' : 'api_error';
    error.status = response.status;
    error.detail = detail.slice(0, 500);

    // Also into the Vercel function log, so a failure is diagnosable after the
    // fact without reproducing it in the UI.
    console.error(
      `${providerName()} ${response.status} for model ${getModel()}: ${detail.slice(0, 300)}`
    );

    throw error;
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error(`${providerName()} returned no content`);
    error.code = 'empty_response';
    throw error;
  }

  return content;
}

/**
 * Send one submission to the model for grading.
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
