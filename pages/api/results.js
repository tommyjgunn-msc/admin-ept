// pages/api/results.js — student results grouped by sitting, newest first.
import { getResultsByDate } from '../../utils/sheets/results';
import { mailConfigured, mailTransport, REPORT_RECIPIENTS, getSender } from '../../utils/mailer';
import { withAdminAuth } from '../../utils/withAdminAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const dates = await getResultsByDate();

  return res.status(200).json({
    dates,
    mail: {
      configured: mailConfigured(),
      transport: mailTransport(),
      sender: getSender(),
      recipients: REPORT_RECIPIENTS,
    },
  });
}

export default withAdminAuth(handler);
