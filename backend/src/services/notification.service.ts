import mongoose from "mongoose";
import Notification, { INotification } from "../models/Notification.model";
import { NotificationResponseDto } from "../dto/notification.dto";
import { AppError } from "../utils/AppError";

function toDto(n: INotification): NotificationResponseDto {
  return {
    _id: (n as any)._id?.toString() ?? "",
    userId: (n as any).userId?.toString() ?? "",
    type: n.type,
    title: n.title,
    body: n.body,
    metadata: n.metadata,
    isRead: n.isRead,
    eventKey: n.eventKey,
    createdAt: (n as any).createdAt?.toISOString?.() ?? "",
  };
}

export class NotificationService {
  /**
   * Creates a notification only if the eventKey does not already exist
   * (idempotency guard).
   */
  async createIfNotExists(payload: {
    userId: string;
    type: INotification["type"];
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    eventKey: string;
  }): Promise<NotificationResponseDto | null> {
    const exists = await Notification.findOne({
      eventKey: payload.eventKey,
    }).lean();
    if (exists) return null;

    const doc = await Notification.create({
      userId: new mongoose.Types.ObjectId(payload.userId),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? {},
      eventKey: payload.eventKey,
      isRead: false,
    });
    return toDto(doc);
  }

  /**
   * Returns notifications for a user, newest first. Optionally filtered to
   * unread only.
   */
  async getForUser(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationResponseDto[]> {
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (unreadOnly) filter.isRead = false;

    const docs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return docs.map((d) => toDto(d as unknown as INotification));
  }

  /** Returns the count of unread notifications for a user. */
  async unreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  /** Marks a single notification as read. */
  async markRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const doc = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { isRead: true },
      { new: true },
    );
    if (!doc) {
      throw AppError.notFound("Notification not found");
    }
    return toDto(doc);
  }

  /** Marks all of a user's notifications as read. */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
    return { updated: result.modifiedCount };
  }
}
