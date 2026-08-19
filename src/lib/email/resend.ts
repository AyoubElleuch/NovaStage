import { Resend } from "resend";
import { renderWaitlistJoinedEmail } from "./templates/waitlist-joined";
import { renderWaitlistApprovedEmail } from "./templates/waitlist-approved";
import { renderPasswordResetEmail } from "./templates/password-reset";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "NovaStage <onboarding@resend.dev>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://novastage.dev";

const resendClient = apiKey ? new Resend(apiKey) : null;

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends a confirmation email when a user joins the waitlist.
 */
export async function sendWaitlistJoinedEmail({
  email,
  name,
}: {
  email: string;
  name?: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = renderWaitlistJoinedEmail({ email, name, appUrl });

  if (!resendClient) {
    console.info(`[Email Dev Mode] Waitlist joined email for ${email} (RESEND_API_KEY not configured)`);
    return { success: true, id: `dev-mock-${Date.now()}` };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send waitlist joined email to ${email}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email.";
    console.error(`[Resend Exception] Error sending to ${email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends an invitation & credentials email when an applicant is approved.
 */
export async function sendWaitlistApprovedEmail({
  email,
  temporaryPassword,
  name,
}: {
  email: string;
  temporaryPassword: string;
  name?: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = renderWaitlistApprovedEmail({
    email,
    temporaryPassword,
    name,
    appUrl,
  });

  if (!resendClient) {
    console.info(
      `[Email Dev Mode] Waitlist approved email for ${email} with temporary password "${temporaryPassword}" (RESEND_API_KEY not configured)`
    );
    return { success: true, id: `dev-mock-${Date.now()}` };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send approval email to ${email}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email.";
    console.error(`[Resend Exception] Error sending to ${email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends a password reset recovery link email.
 */
export async function sendPasswordResetEmail({
  email,
  resetUrl,
  name,
}: {
  email: string;
  resetUrl: string;
  name?: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = renderPasswordResetEmail({
    email,
    resetUrl,
    name,
    appUrl,
  });

  if (!resendClient) {
    console.info(
      `[Email Dev Mode] Password reset email for ${email} with link "${resetUrl}" (RESEND_API_KEY not configured)`
    );
    return { success: true, id: `dev-mock-${Date.now()}` };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send password reset email to ${email}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email.";
    console.error(`[Resend Exception] Error sending to ${email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

