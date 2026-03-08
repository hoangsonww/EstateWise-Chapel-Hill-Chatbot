export type AlertFrequency = "hourly" | "daily" | "custom";
export type AlertType = "new_match" | "price_drop" | "status_change";

export interface CreateSavedSearchDto {
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  frequency?: AlertFrequency;
  alertTypes?: AlertType[];
  priceDropPercent?: number;
  priceDropAmount?: number;
}

export interface UpdateSavedSearchDto {
  name?: string;
  query?: string;
  filters?: Record<string, unknown>;
  frequency?: AlertFrequency;
  alertTypes?: AlertType[];
  priceDropPercent?: number;
  priceDropAmount?: number;
}

export interface SavedSearchResponseDto {
  _id: string;
  userId: string;
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  frequency: AlertFrequency;
  alertTypes: AlertType[];
  lastRunAt?: string | null;
  lastResultIds: string[];
  priceDropPercent?: number | null;
  priceDropAmount?: number | null;
  createdAt: string;
  updatedAt: string;
}
