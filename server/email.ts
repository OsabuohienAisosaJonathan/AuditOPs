import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'MiAuditOps <noreply@miauditops.com>';

export function getBaseUrl(req?: { headers?: { host?: string } }): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  if (req?.headers?.host) {
    const protocol = 'https';
    return `${protocol}://${req.headers.host}`;
  }
  
  // Fallback for Replit - should never reach here in production
  // as req.headers.host is always available
  console.warn('[Email] No APP_URL set and no request host available');
  return 'https://miauditops.replit.app';
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  fullName: string,
  req?: { headers?: { host?: string } }
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[Email] RESEND_API_KEY not configured - cannot send verification emails');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your MiAuditOps account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; margin: 0;">MiAuditOps</h1>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1a1a2e;">Welcome, ${fullName}!</h2>
            <p>Thanks for signing up for MiAuditOps. Please verify your email address to complete your registration.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} Miemploya Audit Services. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send verification email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Verification email sent to ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error sending verification email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  fullName: string,
  req?: { headers?: { host?: string } }
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[Email] RESEND_API_KEY not configured - cannot send password reset emails');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl(req);
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your MiAuditOps password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; margin: 0;">MiAuditOps</h1>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #1a1a2e;">Password Reset Request</h2>
            <p>Hi ${fullName}, we received a request to reset your password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} Miemploya Audit Services. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Password reset email sent to ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Error sending password reset email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

export function logEmailConfigStatus(): void {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] WARNING: RESEND_API_KEY is not set. Email verification will not work.');
  } else {
    console.log('[Email] Resend email service configured');
  }
  
  if (!process.env.FROM_EMAIL) {
    console.warn('[Email] WARNING: FROM_EMAIL is not set. Using default sender address.');
  } else {
    console.log(`[Email] FROM_EMAIL configured: ${process.env.FROM_EMAIL}`);
  }
  
  if (!process.env.APP_URL) {
    console.warn('[Email] WARNING: APP_URL is not set. Email links will use request host as fallback.');
  }
}
