// pages/api/generate-prompts.js — Draft the three writing prompts with AI.
//
// Called from the create-test writing form. Returns prompts shaped exactly
// like the editor's state ({ type, text, wordLimit }), so the admin reviews
// and edits them in place before the test is saved — nothing is written to
// the sheet here.
import { generateWritingPrompts, getModel, hasApiKey } from '../../utils/cerebras';
import { withAdminAuth } from '../../utils/withAdminAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!hasApiKey()) {
    return res.status(503).json({
      error: 'missing_api_key',
      message: 'CEREBRAS_API is not set on this deployment.',
    });
  }

  try {
    const prompts = await generateWritingPrompts(req.body?.theme);
    return res.status(200).json({ prompts, model: getModel() });
  } catch (error) {
    if (error.code === 'rate_limited') {
      return res.status(429).json({
        error: 'rate_limited',
        message: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error.code === 'bad_generation') {
      return res.status(502).json({ error: 'bad_generation', message: error.message });
    }
    if (error.code === 'network_error') {
      return res.status(504).json({ error: 'network_error', message: error.message });
    }
    throw error; // withAdminAuth turns anything else into a clean 500
  }
}

export default withAdminAuth(handler);
