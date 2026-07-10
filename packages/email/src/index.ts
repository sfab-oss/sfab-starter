import { env } from "cloudflare:workers";
import { type ComponentType, createElement } from "react";
import { Resend } from "resend";
import {
  OrganizationInvitationTemplate,
  type OrganizationInvitationTemplateProps,
} from "./templates/organization-invitation";
import {
  PasswordResetTemplate,
  type PasswordResetTemplateProps,
} from "./templates/password-reset";

function getResend(): Resend {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

const emailTemplates = {
  "organization-invitation": {
    id: "organization-invitation",
    subject: "You've been invited to join an organization",
    component: OrganizationInvitationTemplate,
  },
  "password-reset": {
    id: "password-reset",
    subject: "Reset your password",
    component: PasswordResetTemplate,
  },
} as const;

type TemplateId = keyof typeof emailTemplates;

interface TemplateProps {
  "organization-invitation": OrganizationInvitationTemplateProps;
  "password-reset": PasswordResetTemplateProps;
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
    throw new Error("Failed to send email", { cause: error });
  }
};
