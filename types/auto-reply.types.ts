export interface AutoReplySettings {
  feedback: {
    enabled: boolean;
    message: string;
  };
  issues: {
    enabled: boolean;
    message: string;
  };
  contact: {
    enabled: boolean;
    emailSubject: string;
    emailBody: string;
  };
}

export const DEFAULT_AUTO_REPLY_SETTINGS: AutoReplySettings = {
  feedback: {
    enabled: true,
    message: "Thank you for submitting your feedback. Your feedback has been received, reviewed by automated checks, and approved. It is now visible on the project page.",
  },
  issues: {
    enabled: true,
    message: "Thank you for submitting your issue report. Your report has been received, reviewed by automated checks, and accepted for handling by our team. We will respond as soon as possible.",
  },
  contact: {
    enabled: false,
    emailSubject: "We've received your message",
    emailBody: "Thank you for contacting InfraWatch. We have received your message and will get back to you as soon as possible.",
  },
};
