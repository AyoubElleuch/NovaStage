interface PasswordResetEmailProps {
  email: string;
  resetUrl: string;
  name?: string;
  appUrl?: string;
}

export function renderPasswordResetEmail({
  email,
  resetUrl,
  name,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://novastage.dev",
}: PasswordResetEmailProps): { subject: string; html: string; text: string } {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const subject = "Reset your NovaStage password";
  const logoUrl = `${appUrl.replace(/\/$/, "")}/images/logo-email-v2.png`;

  const text = `
${greeting}

We received a request to reset the password for your NovaStage account (${email}).

Reset your password by visiting this link:
${resetUrl}

This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.

— The NovaStage Team
Collaborative System Architecture & Stack Designer
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f1ec;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:#fdfdfc;border:1px solid #e4dfd5;border-radius:8px;font-family:'Trebuchet MS','Segoe UI',Tahoma,sans-serif;">
          <!-- Header -->
          <tr>
            <td style="padding:18px 32px;border-bottom:1px solid #eeebe5;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <img src="${logoUrl}" width="120" height="55" alt="NovaStage" style="display:block;border:0;width:120px;height:55px;max-width:120px;" />
                  </td>
                  <td align="right" style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#7a736c;">
                    System Architecture &amp; Stack Designer
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 6px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#386233;">Password recovery</p>
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:bold;color:#24221f;letter-spacing:-0.01em;">Reset your password.</h1>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#24221f;">${greeting}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#57534b;">
                We received a request to reset the password for your NovaStage account (<strong style="color:#24221f;">${email}</strong>). Click the button below to choose a new password.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:20px 32px 14px;">
              <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#24221f;color:#fdfdfc;font-size:13px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">Reset password</a>
            </td>
          </tr>
          <!-- Expiry Notice -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#7a736c;">
                This recovery link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
              </p>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;font-family:'Trebuchet MS','Segoe UI',Tahoma,sans-serif;">
          <tr>
            <td align="center" style="padding:18px 32px;font-size:11px;line-height:1.6;color:#a39e93;">
              NovaStage — Collaborative System Architecture &amp; Stack Designer<br />
              Need assistance? Reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, html, text };
}
