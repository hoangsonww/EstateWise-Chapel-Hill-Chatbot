export interface CommunityInsight {
  id: number;
  category: string;
  title: string;
  description: string;
  source?: string;
  lastUpdated: string;
}

export type CommunityInsightSeed = Omit<CommunityInsight, "id">;
