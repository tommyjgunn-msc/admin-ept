// pages/api/results/report.js — build the PDF report for one sitting and mail
// it to the results distribution list.
//
// POST { date_iso, preview? }
//   preview: true  -> stream the PDF back instead of sending, so an admin can
//                     check the document before it goes to anyone.
import { getResultsByDate } from '../../../utils/sheets/results';
import { buildResultsPdf } from '../../../utils/pdfReport';
import { sendMail, REPORT_RECIPIENTS, getSender } from '../../../utils/mailer';
import { withAdminAuth } from '../../../utils/withAdminAuth';

function summaryLines(sitting) {
  const s = sitting.summary;
  return [
    `EPT results for ${sitting.date_label}.`,
    '',
    `Students: ${s.students}`,
    `Fully marked: ${s.complete}`,
    `Average (fully marked only): ${s.averagePercentage !== null ? `${s.averagePercentage}%` : 'n/a'}`,
    `Awaiting human review: ${s.needsReview}`,
    `Proctoring flags raised: ${s.flagged}`,
    '',
    'The attached PDF lists every student with their section marks.',
    '',
    'Sent automatically by the Futurimi admin console.',
  ].join('\n');
}

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
  const filename = `EPT-results-${dateIso}.pdf`;

  // Preview: hand the document back so it can be checked before anyone is
  // mailed. Nothing is sent on this path.
  if (req.body?.preview) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.status(200).send(pdf);
  }

  try {
    const sent = await sendMail({
      to: REPORT_RECIPIENTS,
      subject: `EPT results — ${sitting.date_label}`,
      text: summaryLines(sitting),
      attachment: { filename, content: pdf, mimeType: 'application/pdf' },
    });

    return res.status(200).json({
      message: `Report sent to ${sent.to.length} recipient${sent.to.length === 1 ? '' : 's'}`,
      recipients: sent.to,
      sender: getSender(),
      students: sitting.summary.students,
    });
  } catch (error) {
    if (error.code === 'delegation_required') {
      return res.status(503).json({ error: 'delegation_required', message: error.message });
    }
    if (error.code === 'mail_not_configured') {
      return res.status(503).json({ error: 'mail_not_configured', message: error.message });
    }
    return res.status(502).json({ error: 'send_failed', message: error.message });
  }
}

export default withAdminAuth(handler);
