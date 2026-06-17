import { env } from "cloudflare:workers";
import { type ComponentType, createElement } from "react";
import { Resend } from "resend";
import {
  OrganizationInvitationTemplate,
  type OrganizationInvitationTemplateProps,
} from "./templates/organization-invitation";

let resendClient: Resend | undefined;

// Construct the Resend client lazily so importing this module does not throw
// when RESEND_API_KEY is unset (e.g. in tests). The key is only needed to
// actually send an email.
function getResend(): Resend {
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

const emailTemplates = {
  "organization-invitation": {
    id: "organization-invitation",
    subject: "You've been invited to join an organization",
    component: OrganizationInvitationTemplate,
  },
} as const;

type TemplateId = keyof typeof emailTemplates;

interface TemplateProps {
  "organization-invitation": OrganizationInvitationTemplateProps;
}

export const sendMail = async <T extends TemplateId>(
  to: string,
  templateId: T,
  props: TemplateProps[T]
): Promise<void> => {
  if (env.MOCK_SEND_EMAIL === "true") {
    console.log(
      "📨 Email sent to:",
      to,
      "with template:",
      templateId,
      "and props:",
      props
    );
    return;
  }

  const emailSender = env.EMAIL_SENDER;

  if (!emailSender) {
    throw new Error("EMAIL_SENDER is not set");
  }

  const template = emailTemplates[templateId];
  const subject = template.subject;
  const Component = template.component;

  const emailElement = createElement(
    Component as ComponentType<TemplateProps[T]>,
    props
  );

  try {
    await getResend().emails.send({
      from: emailSender,
      to,
      subject,
      react: emailElement,
    });

    console.log("📨 Email sent to:", to, "with template:", templateId);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
};
