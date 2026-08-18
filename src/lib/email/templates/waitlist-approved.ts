interface WaitlistApprovedEmailProps {
  email: string;
  temporaryPassword: string;
  name?: string;
  appUrl?: string;
}

export function renderWaitlistApprovedEmail({
  email,
  temporaryPassword,
  name,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://novastage.dev",
}: WaitlistApprovedEmailProps): { subject: string; html: string; text: string } {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const subject = "Welcome to NovaStage — Your account is ready";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const logoUrl = `${appUrl.replace(/\/$/, "")}/images/logo-email-v2.png`;

  const text = `
${greeting}

Welcome to NovaStage!

Your access request has been approved and your workspace is now active.

Your login credentials:

Email: ${email}
Temporary password: ${temporaryPassword}

Log in here: ${loginUrl}

You can change this password anytime in Account Settings after logging in.

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
              <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#386233;">Access approved</p>
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:bold;color:#24221f;letter-spacing:-0.01em;">Welcome to NovaStage.</h1>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#24221f;">${greeting}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#57534b;">
                Your access request has been approved. Your workspace is active and ready — log in with the credentials below.
              </p>
            </td>
          </tr>
          <!-- Credentials -->
          <tr>
            <td style="padding:18px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeebe5;border-radius:8px;background-color:#f8f6f1;">
                <tr>
                  <td colspan="2" style="padding:12px 18px 0;font-size:10px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#7a736c;">
                    Your Login Credentials
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:10px 18px 14px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#7a736c;">Email address</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:bold;color:#24221f;background-color:#fdfdfc;border:1px solid #e4dfd5;border-radius:6px;padding:8px 10px;">${email}</p>
                  </td>
                  <td width="50%" style="padding:10px 18px 14px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#7a736c;">Temporary password</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:bold;color:#24221f;background-color:#fdfdfc;border:1px solid #e4dfd5;border-radius:6px;padding:8px 10px;">${temporaryPassword}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0 18px 14px;font-size:12px;line-height:1.5;color:#57534b;border-top:1px solid #eeebe5;">
                    <p style="margin:10px 0 0;">You can change this password anytime in Account Settings after logging in.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:20px 32px 28px;">
              <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#24221f;color:#fdfdfc;font-size:13px;font-weight:bold;text-decoration:none;padding:11px 22px;border-radius:8px;">Log in to your account</a>
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
