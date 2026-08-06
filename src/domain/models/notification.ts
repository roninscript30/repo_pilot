/** Unified notification from a provider (GitHub notifications API). */
export interface AppNotification {
  readonly id: string;
  readonly isUnread: boolean;
  /** Provider reason code: review_requested, mention, assign, ... */
  readonly reason: string;
  readonly subjectTitle: string;
  readonly subjectType: string;
  /** Provider URL for the subject (issue/PR/commit). */
  readonly url: string;
  readonly repositoryFullName: string;
  readonly updatedAt: string;
}

export const NOTIFICATION_REASON_LABELS: Readonly<Record<string, string>> = {
  review_requested: "Review requested",
  mention: "Mentioned you",
  assign: "Assigned to you",
  author: "Your change was updated",
  comment: "New comment",
  invitation: "Invitation",
  manual: "Subscribed",
  security_alert: "Security alert",
  state_change: "State changed",
  subscribed: "Subscribed",
  team_mention: "Team mention",
  release: "New release",
  workflow: "Workflow event",
  ci_activity: "CI activity",
};
