// utils/mailer.js — sends mail as the writing-centre account via the Gmail API.
//
// Reuses the Google service account that already reads the spreadsheet, so no
// new provider, dependency or password is involved. Sending *as* a human
// mailbox requires that service account to hold domain-wide delegation for the
// gmail.send scope; see MISSING_DELEGATION below for the exact setup, which a
// Workspace admin has to do once.
import { google } from 'googleapis';

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Who the results reports go to. Overridable without a code change.
export const REPORT_RECIPIENTS = (process.env.REPORT_RECIPIENTS ||
  'lhirwa@alueducation.com,clsaro@alueducation.com,jipinmoye@alueducation.com')
  .split(',').map(s => s.trim()).filter(Boolean);

export function getSender() {
  return process.env.GMAIL_SENDER || 'thewritingcentre@alueducation.com';
}

/**
 * Which delivery route is available, in preference order.
 *
 * Deliberately not SMTP: Vercel's serverless functions are a poor place for
 * outbound SMTP (their own guidance is to use an HTTP email service, and
 * port 587 is widely reported to hang there), so a Gmail app password would
 * authenticate fine and then time out. Both routes below are HTTPS.
 *
 *  'resend' — HTTP API, needs only an API key, no Workspace admin involved.
 *  'gmail'  — Gmail API as the writing-centre mailbox; needs domain-wide
 *             delegation, which only a Workspace admin can grant.
 */
export function mailTransport() {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) return 'gmail';
  return null;
}

export function mailConfigured() {
  return mailTransport() !== null;
}

const MISSING_DELEGATION =
  'Gmail rejected the service account. A Workspace admin needs to grant it ' +
  'domain-wide delegation: Admin console → Security → Access and data control → ' +
  'API controls → Domain-wide delegation → Add new, using the service account\'s ' +
  'client ID and the scope https://www.googleapis.com/auth/gmail.send. The ' +
  `sender (${'${GMAIL_SENDER}'}) must also be a real mailbox in the domain.`;

function privateKey() {
  return (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '');
}

/** Subjects carry en/em dashes, so encode rather than emit raw 8-bit. */
function encodeHeader(value) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function buildMime({ from, to, subject, text, attachment }) {
  const boundary = `ept_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const lines = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
  ];

  if (attachment) {
    // Base64 bodies must be wrapped; unwrapped lines break some receivers.
    const encoded = attachment.content.toString('base64').replace(/(.{76})/g, '$1\r\n');
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      encoded,
    );
  }

  lines.push(`--${boundary}--`, '');
  return lines.join('\r\n');
}

/**
 * Send over the Resend HTTP API. Sending *from* an @alueducation.com address
 * needs that domain verified in Resend (DNS records); until then the message
 * goes out from Resend's own sending domain with the writing-centre address
 * as Reply-To, so replies still land in the right inbox.
 */
async function sendViaResend({ to, subject, text, attachment }) {
  const from = process.env.RESEND_FROM || 'EPT Results <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: getSender(),
      subject,
      text,
      ...(attachment && {
        attachments: [{
          filename: attachment.filename,
          content: attachment.content.toString('base64'),
        }],
      }),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = String(data?.message || data?.error || `HTTP ${response.status}`);
    const error = new Error(
      /domain|from/i.test(detail)
        ? `Resend rejected the sender address: ${detail}. Either verify the domain in Resend ` +
          'or leave RESEND_FROM unset to send from Resend\'s own domain.'
        : `Resend send failed: ${detail.slice(0, 200)}`
    );
    error.code = 'send_failed';
    throw error;
  }

  return { id: data.id, to, from };
}

/**
 * Send one message, optionally with a single attachment.
 * Throws with .code set to a caller-friendly reason.
 */
export async function sendMail({ to, subject, text, attachment }) {
  const transport = mailTransport();
  if (!transport) {
    const error = new Error('No email transport is configured on this deployment.');
    error.code = 'mail_not_configured';
    throw error;
  }

  if (transport === 'resend') {
    return sendViaResend({ to, subject, text, attachment });
  }

  const from = getSender();
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: [SEND_SCOPE],
    subject: from, // impersonate the writing-centre mailbox
  });

  const gmail = google.gmail({ version: 'v1', auth });
  const raw = Buffer.from(buildMime({ from, to, subject, text, attachment }))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    return { id: result.data.id, to, from };
  } catch (error) {
    const detail = String(error?.response?.data?.error_description || error?.message || '');
    if (/unauthorized_client|invalid_grant|forbidden|insufficient/i.test(detail)) {
      const wrapped = new Error(MISSING_DELEGATION.replace('${GMAIL_SENDER}', from));
      wrapped.code = 'delegation_required';
      wrapped.detail = detail.slice(0, 300);
      throw wrapped;
    }
    const wrapped = new Error(`Gmail send failed: ${detail.slice(0, 200)}`);
    wrapped.code = 'send_failed';
    throw wrapped;
  }
}
