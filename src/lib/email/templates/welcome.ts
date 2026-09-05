interface WelcomeEmailProps {
  email: string;
  name?: string;
  appUrl?: string;
}

export function renderWelcomeEmail({
  email,
  name,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://novastage.dev",
}: WelcomeEmailProps): { subject: string; html: string; text: string } {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const subject = "Welcome to NovaStage — Official Beta Launch";
  const dashboardUrl = `${appUrl.replace(/\/$/, "")}/dashboard`;
  const baseUrl = appUrl.replace(/\/$/, "");
  const logoUrl = `${baseUrl}/images/logo-email-v2.png`;

  const text = `
${greeting}

Welcome to NovaStage Beta (v1.0.5)!

Thank you for joining NovaStage (${email}). Your account is active and your workspace is ready. You can now model cloud architectures, collaborate in real time, and map delivery milestones seamlessly.

Launch your workspace: ${dashboardUrl}

If you have any feedback or questions during the Beta, simply reply directly to this email.

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
              <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#386233;">Official Beta Access</p>
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:bold;color:#24221f;letter-spacing:-0.01em;">Welcome to NovaStage.</h1>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#24221f;">${greeting}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#57534b;">
                Thank you for creating your NovaStage account. Your workspace is active and you are officially part of our Beta release (v1.0.5). Start designing your cloud topologies and planning collaborative roadmaps today.
              </p>
            </td>
          </tr>
          <!-- Meta strip -->
          <tr>
            <td style="padding:18px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeebe5;border-radius:8px;background-color:#f8f6f1;">
                <tr>
                  <td style="padding:14px 18px;border-right:1px solid #eeebe5;">
                    <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#7a736c;">Account email</p>
                    <p style="margin:0;font-size:13px;font-weight:bold;color:#24221f;">${email}</p>
                  </td>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#7a736c;">Release Channel</p>
                    <p style="margin:0;font-size:13px;font-weight:bold;color:#386233;">Beta v1.0.5</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:20px 32px 28px;">
              <a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#24221f;color:#fdfdfc;font-size:13px;font-weight:bold;text-decoration:none;padding:11px 22px;border-radius:8px;">Launch Workspace</a>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;font-family:'Trebuchet MS','Segoe UI',Tahoma,sans-serif;">
          <tr>
            <td align="center" style="padding:18px 32px;font-size:11px;line-height:1.6;color:#a39e93;">
              NovaStage — Collaborative System Architecture &amp; Stack Designer<br />
              Need assistance or have feedback on the Beta? Reply directly to this email.
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
