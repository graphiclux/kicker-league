// src/emails/magic-link.ts

type MagicLinkEmailProps = {
  url: string;
  email: string;
  logoUrl?: string;
};

export function buildMagicLinkEmail({
  url,
  email,
  logoUrl,
}: MagicLinkEmailProps) {
  const subject = "Your Kicker League sign-in link";

  const previewText = "Sign in to Kicker League with one click.";
  const brandName = "Kicker League";
  const tagline = "And It's No Good";

  const safeUrl = url;

  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="${tagline} logo" width="160" style="display:block;margin:0 auto 16px auto;" />`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>${subject}</title>
    <style>
      /* Basic reset for email clients */
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${previewText}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f172a;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background:#020617;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 16px 24px;text-align:center;">
                ${logoImg}
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;font-size:20px;font-weight:600;margin-bottom:4px;">
                  ${brandName}
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#a3e635;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">
                  ${tagline}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
                  Hi coach,
                </p>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 16px 0;">
                  Here’s your one-click sign-in link for <strong>${brandName}</strong>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 16px 24px;" align="center">
                <a href="${safeUrl}"
                  style="
                    display:inline-block;
                    padding:10px 22px;
                    border-radius:999px;
                    background:linear-gradient(to right,#bef264,#4ade80);
                    color:#022c22;
                    font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    font-size:14px;
                    font-weight:600;
                    text-decoration:none;
                    margin-bottom:12px;
                  "
                >
                  Sign in to Kicker League
                </a>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#64748b;font-size:11px;line-height:1.5;margin:0;">
                  This link can only be used once and will expire soon.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#6b7280;font-size:11px;line-height:1.6;margin:0 0 8px 0;">
                  Signing in as: <span style="color:#e5e7eb;">${email}</span>
                </p>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#4b5563;font-size:11px;line-height:1.6;margin:0 0 16px 0;">
                  If you didn’t request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 24px 24px;border-top:1px solid #1f2937;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#4b5563;font-size:10px;line-height:1.6;margin:12px 0 0 0;text-align:center;">
                  ${brandName} · ${tagline}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${subject}

Hi coach,

Here is your sign-in link for ${brandName}:

${safeUrl}

This link can only be used once and will expire soon.

Signing in as: ${email}

If you didn't request this, you can ignore this email.

— ${brandName} | ${tagline}
`;

  return { subject, html, text };
}
