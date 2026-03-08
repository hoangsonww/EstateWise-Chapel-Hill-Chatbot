import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { NotificationService } from "../services/notification.service";

const service = new NotificationService();

export async function getNotifications(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const unreadOnly = req.query.unreadOnly === "true";
  const results = await service.getForUser(userId, unreadOnly);
  res.json(results);
}

export async function getUnreadCount(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const count = await service.unreadCount(userId);
  res.json({ count });
}

export async function markNotificationRead(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const result = await service.markRead(req.params.id, userId);
  res.json(result);
}

export async function markAllNotificationsRead(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const result = await service.markAllRead(userId);
  res.json(result);
}
