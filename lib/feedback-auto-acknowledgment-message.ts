// No server-only imports here (db, notification-persistence) — this constant is also
// imported by the citizen-facing "My Feedbacks" client component.

export const FEEDBACK_AUTO_ACK_DELAY_MINUTES = 5;

export const FEEDBACK_AUTO_ACKNOWLEDGMENT_MESSAGE =
  "Thank you for reaching out and providing comments on the implementation of our FMR. " +
  "We have logged your report, and our Technical Team is currently verifying it. " +
  "We will provide you with an update as soon as we have more information. " +
  "We appreciate your patience and your help in making our service better.";
