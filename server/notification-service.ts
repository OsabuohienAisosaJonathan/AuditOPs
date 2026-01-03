import { storage } from "./storage";
import { Resend } from "resend";
import type { InsertNotification } from "@shared/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@miauditops.com";

interface NotificationPayload {
  organizationId: string;
  userId?: string;
  type: "exception" | "variance" | "export" | "system";
  title: string;
  message: string;
  refType?: string;
  refId?: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
  emailRecipients?: string[];
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const notificationData: InsertNotification = {
      organizationId: payload.organizationId,
      userId: payload.userId || null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      refType: payload.refType || null,
      refId: payload.refId || null,
      metadata: payload.metadata || null,
      isRead: false,
      emailSent: false,
    };

    const notification = await storage.createNotification(notificationData);

    if (payload.sendEmail && payload.emailRecipients && payload.emailRecipients.length > 0) {
      sendNotificationEmail(notification.id, payload.emailRecipients, payload.title, payload.message)
        .catch(err => console.error("[Notification] Failed to send email:", err));
    }
  } catch (error) {
    console.error("[Notification] Failed to create notification:", error);
  }
}

async function sendNotificationEmail(
  notificationId: string,
  recipients: string[],
  subject: string,
  body: string
): Promise<void> {
  if (!resend) {
    console.warn("[Notification] Email not configured - RESEND_API_KEY not set");
    return;
  }

  try {
    for (const recipient of recipients) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: `[MiAuditOps] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">${subject}</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">${body}</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">
              You received this email because you have notifications enabled in MiAuditOps.
              <br />Visit your <a href="${process.env.APP_URL || 'https://miauditops.com'}/settings">Settings</a> to manage notification preferences.
            </p>
          </div>
        `,
      });
    }

    await storage.updateNotificationEmailStatus(notificationId, true);
  } catch (error: any) {
    console.error("[Notification] Email send failed:", error);
    await storage.updateNotificationEmailStatus(notificationId, false, error.message);
  }
}

export async function notifyExceptionCreated(
  organizationId: string,
  exceptionId: string,
  clientName: string,
  departmentName: string,
  varianceAmount: string,
  varianceType: string,
  date: string
): Promise<void> {
  const title = `New Exception: ${varianceType}`;
  const message = `A ${varianceType} exception was recorded for ${departmentName} at ${clientName} on ${date}. Variance amount: ${varianceAmount}`;

  const admins = await getOrganizationAdmins(organizationId);
  const emailRecipients = admins.filter(u => u.email).map(u => u.email);

  await createNotification({
    organizationId,
    type: "exception",
    title,
    message,
    refType: "exception",
    refId: exceptionId,
    metadata: { clientName, departmentName, varianceAmount, varianceType, date },
    sendEmail: emailRecipients.length > 0,
    emailRecipients,
  });
}

export async function notifyVarianceThresholdExceeded(
  organizationId: string,
  clientName: string,
  departmentName: string,
  variancePercent: number,
  threshold: number,
  date: string
): Promise<void> {
  const title = `High Variance Alert: ${variancePercent.toFixed(1)}%`;
  const message = `Variance of ${variancePercent.toFixed(1)}% exceeds the ${threshold}% threshold for ${departmentName} at ${clientName} on ${date}.`;

  const admins = await getOrganizationAdmins(organizationId);
  const emailRecipients = admins.filter(u => u.email).map(u => u.email);

  await createNotification({
    organizationId,
    type: "variance",
    title,
    message,
    refType: "reconciliation",
    metadata: { clientName, departmentName, variancePercent, threshold, date },
    sendEmail: emailRecipients.length > 0,
    emailRecipients,
  });
}

async function getOrganizationAdmins(organizationId: string): Promise<{ id: string; email: string }[]> {
  try {
    const admins = await storage.getUsersByOrganization(organizationId, { 
      roles: ["super_admin", "supervisor"] 
    });
    return admins.map(u => ({ id: u.id, email: u.email }));
  } catch (error) {
    console.error("[Notification] Failed to get org admins:", error);
    return [];
  }
}
