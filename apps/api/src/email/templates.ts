interface BaseLayoutOptions {
  title: string;
  preview?: string;
  body: string;
  footerNote?: string;
}

const COLORS = {
  primary: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseLayout({ title, preview, body, footerNote }: BaseLayoutOptions) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:${COLORS.text};">
    ${preview ? `<div style="display:none;font-size:1px;color:${COLORS.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preview)}</div>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid ${COLORS.border};overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid ${COLORS.border};">
                <span style="font-size:18px;font-weight:700;color:${COLORS.primary};">Casa Meni</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.55;color:${COLORS.text};">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${COLORS.border};font-size:12px;line-height:1.5;color:${COLORS.muted};">
                ${footerNote ?? `You received this email from Casa Meni Property Management. If this wasn't expected, please ignore it.`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="left">
        <a href="${href}" style="display:inline-block;background:${COLORS.primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export interface SigningRequestEmailVars {
  signerName: string;
  envelopeTitle: string;
  organizationName: string;
  message?: string | null;
  signingUrl: string;
  expiresAt?: Date | null;
}

export function signingRequestEmail(v: SigningRequestEmailVars) {
  const subject = `${v.organizationName} requests your signature: ${v.envelopeTitle}`;
  const expiresLine = v.expiresAt
    ? `<p style="margin:8px 0 0;color:${COLORS.muted};font-size:13px;">This link expires on ${v.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>`
    : '';
  const customMessage = v.message
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:${COLORS.bg};border-left:3px solid ${COLORS.primary};border-radius:4px;color:${COLORS.text};font-size:14px;white-space:pre-wrap;">${escapeHtml(v.message)}</blockquote>`
    : '';

  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(v.signerName)},</p>
    <p style="margin:0 0 8px;"><strong>${escapeHtml(v.organizationName)}</strong> has sent you a document to review and sign:</p>
    <p style="margin:8px 0 0;font-size:17px;font-weight:600;color:${COLORS.text};">${escapeHtml(v.envelopeTitle)}</p>
    ${customMessage}
    ${button('Review & Sign Document', v.signingUrl)}
    ${expiresLine}
    <p style="margin:24px 0 0;font-size:13px;color:${COLORS.muted};">
      Or copy this link into your browser:<br />
      <a href="${v.signingUrl}" style="color:${COLORS.primary};word-break:break-all;">${v.signingUrl}</a>
    </p>
  `;

  const text = [
    `Hi ${v.signerName},`,
    ``,
    `${v.organizationName} has sent you a document to review and sign: ${v.envelopeTitle}`,
    v.message ? `\n${v.message}\n` : '',
    `Sign here: ${v.signingUrl}`,
    v.expiresAt ? `\nThis link expires on ${v.expiresAt.toLocaleDateString()}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: baseLayout({ title: subject, preview: `Sign "${v.envelopeTitle}"`, body }),
    text,
  };
}

export interface SigningCompletedEmailVars {
  recipientName: string;
  envelopeTitle: string;
  signedAt: Date;
  envelopeUrl: string;
}

export function signingCompletedEmail(v: SigningCompletedEmailVars) {
  const subject = `Signed: ${v.envelopeTitle}`;
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(v.recipientName)},</p>
    <p style="margin:0 0 8px;">All parties have signed <strong>${escapeHtml(v.envelopeTitle)}</strong>.</p>
    <p style="margin:8px 0 16px;color:${COLORS.muted};font-size:14px;">Completed ${v.signedAt.toLocaleString()}</p>
    ${button('View Signed Document', v.envelopeUrl)}
  `;

  const text = `Hi ${v.recipientName},\n\nAll parties have signed "${v.envelopeTitle}".\n\nView it here: ${v.envelopeUrl}`;

  return {
    subject,
    html: baseLayout({ title: subject, preview: 'All parties have signed', body }),
    text,
  };
}

export interface SigningDeclinedEmailVars {
  recipientName: string;
  envelopeTitle: string;
  declinedBy: string;
  reason?: string;
  envelopeUrl: string;
}

export function signingDeclinedEmail(v: SigningDeclinedEmailVars) {
  const subject = `Declined: ${v.envelopeTitle}`;
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(v.recipientName)},</p>
    <p style="margin:0 0 8px;"><strong>${escapeHtml(v.declinedBy)}</strong> declined to sign <strong>${escapeHtml(v.envelopeTitle)}</strong>.</p>
    ${v.reason ? `<blockquote style="margin:16px 0;padding:12px 16px;background:${COLORS.bg};border-left:3px solid #ef4444;border-radius:4px;color:${COLORS.text};font-size:14px;">Reason: ${escapeHtml(v.reason)}</blockquote>` : ''}
    ${button('View Envelope', v.envelopeUrl)}
  `;

  const text = `${v.declinedBy} declined to sign "${v.envelopeTitle}".\n${v.reason ? `Reason: ${v.reason}\n` : ''}\n${v.envelopeUrl}`;

  return {
    subject,
    html: baseLayout({ title: subject, preview: 'Signature declined', body }),
    text,
  };
}

export interface TenantWelcomeEmailVars {
  tenantName: string;
  organizationName: string;
  propertyName: string;
  unitNumber: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
}

export function tenantWelcomeEmail(v: TenantWelcomeEmailVars) {
  const subject = `Welcome to ${v.organizationName} — your tenant portal`;
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(v.tenantName)},</p>
    <p style="margin:0 0 8px;">Welcome! ${escapeHtml(v.organizationName)} has set up your tenant portal for <strong>${escapeHtml(v.propertyName)} — Unit ${escapeHtml(v.unitNumber)}</strong>.</p>
    <p style="margin:16px 0 8px;">Use the credentials below to log in:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;padding:16px;width:100%;">
      <tr><td style="padding:4px 12px;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Email</td></tr>
      <tr><td style="padding:0 12px 8px;font-weight:600;font-size:15px;">${escapeHtml(v.email)}</td></tr>
      <tr><td style="padding:4px 12px;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</td></tr>
      <tr><td style="padding:0 12px 8px;font-family:monospace;font-size:15px;font-weight:600;">${escapeHtml(v.tempPassword)}</td></tr>
    </table>
    <p style="margin:8px 0;color:${COLORS.muted};font-size:13px;">Please change your password after your first login.</p>
    ${button('Open Tenant Portal', v.portalUrl)}
    <p style="margin:24px 0 0;font-size:14px;color:${COLORS.text};">From the portal you can:</p>
    <ul style="margin:8px 0 0;padding-left:20px;color:${COLORS.text};font-size:14px;line-height:1.7;">
      <li>View your lease and rent details</li>
      <li>See upcoming and past payments</li>
      <li>Submit and track maintenance requests</li>
      <li>Review and sign documents</li>
    </ul>
  `;

  const text = `Welcome to ${v.organizationName}!\n\nYour tenant portal is ready.\n\nLogin: ${v.email}\nPassword: ${v.tempPassword}\n\nOpen the portal: ${v.portalUrl}\n\nPlease change your password after first login.`;

  return {
    subject,
    html: baseLayout({ title: subject, preview: 'Your tenant portal is ready', body }),
    text,
  };
}

export interface NotificationEmailVars {
  recipientName: string;
  notificationTitle: string;
  notificationBody: string;
  actionLabel?: string;
  actionUrl?: string;
}

export function notificationEmail(v: NotificationEmailVars) {
  const subject = v.notificationTitle;
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(v.recipientName)},</p>
    <p style="margin:0 0 8px;font-size:17px;font-weight:600;">${escapeHtml(v.notificationTitle)}</p>
    <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(v.notificationBody)}</p>
    ${v.actionUrl && v.actionLabel ? button(v.actionLabel, v.actionUrl) : ''}
  `;

  const text = `${v.notificationTitle}\n\n${v.notificationBody}${v.actionUrl ? `\n\n${v.actionUrl}` : ''}`;

  return {
    subject,
    html: baseLayout({ title: subject, preview: v.notificationTitle, body }),
    text,
  };
}
