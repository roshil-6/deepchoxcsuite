export type VentureDailyReportRow = {
  id: string;
  ventureId: number;
  reportDay: string;
  headline: string | null;
  summary: string;
  bodyMd: string;
  sourcesJson: unknown;
  followUpJson: unknown;
  pendingProposedUpdates: unknown;
  userApprovedAt: string | null;
  researchQuery: string | null;
  createdAt: string;
  updatedAt: string;
};
