// pages/api/results.js — student results grouped by sitting, newest first.
import { getResultsByDate } from '../../utils/sheets/results';
import { withAdminAuth } from '../../utils/withAdminAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  return res.status(200).json({ dates: await getResultsByDate() });
}

export default withAdminAuth(handler);
