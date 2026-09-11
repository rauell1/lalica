/**
 * Transactional email notification for new enquiries.
 *
 * Notifications are optional and configured through environment
 * variables. When sending fails after the enquiry was stored, the
 * failure is recorded on the enquiry and shown in the admin interface;
 * the enquiry is never lost and the visitor is not asked to resubmit.
 */

import { Resend } from "resend";

import { getServerEnv } from "@/lib/env";

export interface EnquiryNotificationData {
  publicRef: string;
  name: string;
  organisation: string;
  email: string;
  telephone: string;
  serviceInterest: string;
  message: string;
}

export interface NotifyResult {
  status: "sent" | "failed" | "disabled";
  error?: string;
}

/** Injectable transport so tests can simulate provider failures. */
export type EmailTransport = (data: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
}) => Promise<void>;

const defaultTransport: EmailTransport = async ({ to, from, replyTo, subject, text }) => {
  const env = getServerEnv();
  if (!env.resendApiKey) {
    throw new Error("Resend API key is not configured.");
  }
  const resend = new Resend(env.resendApiKey);
  const result = await resend.emails.send({
    from,
    to: [to],
    replyTo,
    subject,
    text,
  });
  if (result.error) {
    throw new Error(
      `Resend rejected the message: ${result.error.name ?? result.error.message}`,
    );
  }
};

export async function sendEnquiryNotification(
  data: EnquiryNotificationData,
  transport: EmailTransport = defaultTransport,
): Promise<NotifyResult> {
  const env = getServerEnv();
  if (!env.resendApiKey || !env.emailFrom || !env.emailTo) {
    return { status: "disabled" };
  }

  const subject = `New website enquiry ${data.publicRef} from ${data.name}`;
  const body = [
    `New enquiry received from the Lalica website.`,
    ``,
    `Reference: ${data.publicRef}`,
    `Name: ${data.name}`,
    `Organisation: ${data.organisation || "(not given)"}`,
    `Email: ${data.email}`,
    `Telephone: ${data.telephone || "(not given)"}`,
    `Service interest: ${data.serviceInterest}`,
    ``,
    `Message:`,
    data.message,
    ``,
    `Manage this enquiry in the Lalica admin area.`,
  ].join("\n");

  try {
    await transport({
      to: env.emailTo,
      from: env.emailFrom,
      replyTo: data.email,
      subject,
      text: body,
    });
    return { status: "sent" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 400) : "unknown error";
    return { status: "failed", error: message };
  }
}
