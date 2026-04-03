export const STEP_TYPES = [
  { value: "intake_form", label: "Intake Form" },
  { value: "agreement",   label: "Agreement" },
  { value: "task",        label: "Task" },
  { value: "milestone",   label: "Milestone" },
  { value: "checkin",     label: "Check-In" },
  { value: "resource",    label: "Resource" },
] as const;

export type StepType = (typeof STEP_TYPES)[number]["value"];

export const CLIENT_STATUS = {
  on_track:         { label: "On Track",         color: "#C8F04A", bg: "rgba(200,240,74,0.1)" },
  needs_attention:  { label: "Needs Attention",   color: "#F0A94A", bg: "rgba(240,169,74,0.1)" },
  stuck:            { label: "Stuck",             color: "#FF6B6B", bg: "rgba(255,107,107,0.1)" },
} as const;

export type ClientStatus = keyof typeof CLIENT_STATUS;

export const DEFAULT_AUTOMATIONS = [
  { triggerType: "invite_accepted",        messageTemplate: "Welcome! We're excited to work with you.",         channel: "email" },
  { triggerType: "intake_not_submitted",   messageTemplate: "Reminder: Please complete your intake form.",      channel: "email" },
  { triggerType: "agreement_not_signed",   messageTemplate: "Reminder: Please sign your agreement.",           channel: "email" },
  { triggerType: "client_inactive_7d",     messageTemplate: "We noticed you haven't been active. Need help?",  channel: "email" },
  { triggerType: "milestone_completed",    messageTemplate: "Congratulations on completing a milestone! 🎉",   channel: "email" },
  { triggerType: "weekly_checkin",         messageTemplate: "Time for your weekly check-in. How are you doing?", channel: "email" },
];

export const AUTOMATION_LABELS: Record<string, string> = {
  invite_accepted:       "Welcome email after invite accepted",
  intake_not_submitted:  "Reminder if intake form not submitted after 24h",
  agreement_not_signed:  "Reminder if agreement not signed after 24h",
  client_inactive_7d:    "Alert when client inactive for 7 days",
  milestone_completed:   "Congrats email when milestone completed",
  weekly_checkin:        "Weekly check-in reminder",
};
