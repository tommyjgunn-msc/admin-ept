// pages/api/results/report.js — build the PDF results report for one sitting.
//
// POST { date_iso } -> the PDF itself. The client either opens it in a tab or
// saves it; distribution is done by hand from there.
import { getResultsByDate } from '../../../utils/sheets/results';
import { buildResultsPdf } from '../../../utils/pdfReport';
import { withAdminAuth } from '../../../utils/withAdminAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const dateIso = String(req.body?.date_iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return res.status(400).json({ error: 'invalid_date', message: 'date_iso must be YYYY-MM-DD' });
  }

  const dates = await getResultsByDate();
  const sitting = dates.find(d => d.date_iso === dateIso);
  if (!sitting) {
    return res.status(404).json({ error: 'no_results', message: 'No submissions exist for that date.' });
  }

  const pdf = await buildResultsPdf(sitting);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="EPT-results-${dateIso}.pdf"`);
  return res.status(200).send(pdf);
}

export default withAdminAuth(handler);
