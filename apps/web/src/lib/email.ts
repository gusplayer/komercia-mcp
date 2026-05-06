import { Resend } from 'resend';
import { getConfig } from './env.js';

let _resend: Resend | undefined;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(getConfig().RESEND_API_KEY);
  }
  return _resend;
}

export async function sendMagicLinkEmail(params: {
  to: string;
  magicLink: string;
}): Promise<void> {
  const config = getConfig();
  const resend = getResend();

  const { to, magicLink } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Komercia export link</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 40px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px;">
    <div style="margin-bottom: 24px;">
      <div style="width: 40px; height: 40px; background: #6366f1; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <path d="M4 7h16M4 12h12M4 17h8"/>
        </svg>
      </div>
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0f172a;">Export your Komercia store</h1>
      <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.6;">
        Click the button below to get your export token. The link expires in <strong>15 minutes</strong>.
      </p>
    </div>

    <a href="${magicLink}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
      Get my export token →
    </a>

    <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
      Or copy this link into your browser:
    </p>
    <p style="margin: 0; font-size: 12px; color: #64748b; word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
      ${magicLink}
    </p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />

    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
      If you did not request this link, you can safely ignore this email.
      This is an unofficial community tool and is not affiliated with Komercia.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Export your Komercia store

Click the link below to get your export token. It expires in 15 minutes.

${magicLink}

If you did not request this link, you can safely ignore this email.
This is an unofficial community tool and is not affiliated with Komercia.
  `.trim();

  const { error } = await resend.emails.send({
    from: config.FROM_EMAIL,
    to,
    subject: 'Your Komercia store export link',
    html,
    text,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
