import type { CampaignRow, PrizeRow } from "./database";

export interface Theme {
  brandColor?: string;
  brandFg?: string;
  logoUrl?: string | null;
  headline?: string;
  fontFamily?: string;
}

export interface CampaignWithPrizes extends CampaignRow {
  prizes: PrizeRow[];
}

export function readTheme(c: Pick<CampaignRow, "theme">): Theme {
  return (c.theme || {}) as Theme;
}
