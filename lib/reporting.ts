export const REPORT_REASONS = [
  'harassment',
  'privacy',
  'threats',
  'spam',
  'illegal-content',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or targeted abuse',
  privacy: 'Privacy violation',
  threats: 'Threat or intimidation',
  spam: 'Spam or unwanted promotion',
  'illegal-content': 'Potentially illegal content',
  other: 'Other concern',
};

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string'
    && REPORT_REASONS.includes(value as ReportReason);
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string'
    && REPORT_STATUSES.includes(value as ReportStatus);
}
