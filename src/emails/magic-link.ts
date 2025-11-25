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
  const subject = "Your Kicker League magic sign-in link";

  const previewText = "Sign in to Kicker League with one click.";
  const brandName = "Kicker League";
  const tagline = "And It's No Good";

  const safeUrl = url;

  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="${tagline} logo" width="80" style="display:block;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;" />`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${subject}</title>
    <style>
      /* Some clients ignore <style>, so we still inline everything important. */
      body {
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f9fafb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${previewText}
    </div>

    <!-- Outer wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <!-- Inner container -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;background-color:#ffffff;">
            
            <!-- Header bar (match landing top bar) -->
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;background-color:#faf8f4;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td valign="middle" style="text-align:left;">
                      <table cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td valign="middle" style="padding-right:12px;">
                            <div style="width:56px;height:56px;border-radius:999px;overflow:hidden;">
                              ${logoImg}
                            </div>
                          </td>
                          <td valign="middle">
                            <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:700;color:#0f172a;line-height:1.2;">
                              ${brandName}
                            </div>
                            <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#4b5563;margin-top:2px;">
                              ${tagline}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" style="text-align:right;">
                      <div style="display:inline-block;padding:6px 12px;border-radius:999px;border:1px solid #e5e7eb;background-color:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:600;color:#4b5563;">
                        Magic link sign-in
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hero band -->
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#ecfccb,#fefce8);border-bottom:1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding:18px 24px;">
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#4b5563;margin-bottom:6px;">
                        Because kickers deserve their own league
                      </div>
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#0f172a;line-height:1.35;margin-bottom:6px;">
                        Your magic sign-in link is ready
                      </div>
                      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#4b5563;line-height:1.6;max-width:420px;">
                        Use this link to jump into your Kicker League dashboard, create leagues, and track every chaotic kick.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main content card -->
            <tr>
              <td style="padding:20px 24px 8px 24px;background-color:#ffffff;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#111827;line-height:1.6;margin:0 0 10px 0;">
                  Hi coach,
                </p>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#4b5563;line-height:1.6;margin:0 0 16px 0;">
                  Here’s your one-click sign-in link for <strong>${brandName}</strong>. It works for this email:
                  <span style="color:#111827;font-weight:600;">${email}</span>
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
                  <tr>
                    <td align="center">
                      <a href="${safeUrl}"
                        style="
                          display:inline-block;
                          padding:12px 24px;
                          border-radius:999px;
                          background:linear-gradient(to right,#bef264,#4ade80);
                          color:#022c22;
                          font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                          font-size:14px;
                          font-weight:700;
                          text-decoration:none;
                          box-shadow:0 8px 18px rgba(22,163,74,0.35);
                        "
                      >
                        Sign in to Kicker League
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#6b7280;line-height:1.6;margin:0 0 16px 0;">
                  This link can only be used once and will expire soon. If it doesn’t open automatically, you can copy and paste the link below into your browser:
                </p>

                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#1f2933;line-height:1.6;margin:0 0 18px 0;word-break:break-all;">
                  ${safeUrl}
                </p>
              </td>
            </tr>

            <!-- Little “why kickers” strip -->
            <tr>
              <td style="padding:12px 24px 16px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#4b5563;line-height:1.6;margin:0 0 4px 0;font-weight:600;">
                  Why a kicker-only league?
                </p>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#6b7280;line-height:1.6;margin:0;">
                  Every extra point becomes stressful. Every 55-yarder is a double-edged sword. Kicker League runs alongside your main league as a tiny side game with maximum chaos.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 24px 18px 24px;background-color:#ffffff;border-top:1px solid #e5e7eb;">
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9ca3af;line-height:1.6;margin:0 0 6px 0;text-align:center;">
                  If you didn’t request this email, you can safely ignore it.
                </p>
                <p style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9ca3af;line-height:1.6;margin:0;text-align:center;">
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

Why a kicker-only league?
Every extra point becomes stressful. Every 55-yarder is a double-edged sword. Kicker League runs alongside your main league as a tiny side game with maximum chaos.

— ${brandName} | ${tagline}
`;

  return { subject, html, text };
}
