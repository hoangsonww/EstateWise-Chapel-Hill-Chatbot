export type NotificationType = "new_match" | "price_drop" | "status_change";

export interface NotificationResponseDto {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  eventKey: string;
  createdAt: string;
}
