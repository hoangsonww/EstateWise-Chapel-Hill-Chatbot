const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../src/controllers/notification.controller");
const {
  NotificationService,
} = require("../src/services/notification.service");

jest.mock("../src/services/notification.service");
const MockedNotificationService = NotificationService;

describe("NotificationController", () => {
  let mockReq, mockRes;

  const userId = "507f1f77bcf86cd799439012";
  const notifId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: userId },
      params: { id: notifId },
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getNotifications", () => {
    it("should return all notifications for the user", async () => {
      const expected = [
        {
          _id: notifId,
          userId,
          type: "new_match",
          title: "New listing matches",
          body: "2 new properties matched your search.",
          isRead: false,
          eventKey: "search1_new_match_2024-01-01",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      MockedNotificationService.prototype.getForUser = jest
        .fn()
        .mockResolvedValue(expected);

      await getNotifications(mockReq, mockRes);

      expect(
        MockedNotificationService.prototype.getForUser,
      ).toHaveBeenCalledWith(userId, false);
      expect(mockRes.json).toHaveBeenCalledWith(expected);
    });

    it("should pass unreadOnly=true when query param is set", async () => {
      mockReq.query = { unreadOnly: "true" };
      MockedNotificationService.prototype.getForUser = jest
        .fn()
        .mockResolvedValue([]);

      await getNotifications(mockReq, mockRes);

      expect(
        MockedNotificationService.prototype.getForUser,
      ).toHaveBeenCalledWith(userId, true);
    });
  });

  describe("getUnreadCount", () => {
    it("should return the unread notification count", async () => {
      MockedNotificationService.prototype.unreadCount = jest
        .fn()
        .mockResolvedValue(5);

      await getUnreadCount(mockReq, mockRes);

      expect(
        MockedNotificationService.prototype.unreadCount,
      ).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith({ count: 5 });
    });
  });

  describe("markNotificationRead", () => {
    it("should mark a single notification as read", async () => {
      const expected = {
        _id: notifId,
        userId,
        type: "new_match",
        title: "New listing matches",
        body: "2 new properties matched.",
        isRead: true,
        eventKey: "search1_new_match_2024-01-01",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      MockedNotificationService.prototype.markRead = jest
        .fn()
        .mockResolvedValue(expected);

      await markNotificationRead(mockReq, mockRes);

      expect(MockedNotificationService.prototype.markRead).toHaveBeenCalledWith(
        notifId,
        userId,
      );
      expect(mockRes.json).toHaveBeenCalledWith(expected);
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should mark all notifications as read", async () => {
      MockedNotificationService.prototype.markAllRead = jest
        .fn()
        .mockResolvedValue({ updated: 3 });

      await markAllNotificationsRead(mockReq, mockRes);

      expect(
        MockedNotificationService.prototype.markAllRead,
      ).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith({ updated: 3 });
    });
  });
});
