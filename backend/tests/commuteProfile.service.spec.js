/**
 * @jest-environment node
 */

const { Types } = require("mongoose");

// ─── Mock Mongoose CommuteProfile model ──────────────────────────────────────
const saveMock = jest.fn();
const findMock = jest.fn();
const findOneMock = jest.fn();
const findOneAndUpdateMock = jest.fn();
const deleteOneMock = jest.fn();
const sortMock = jest.fn().mockReturnThis();
const execMock = jest.fn();

function CommuteProfileMock(data) {
  Object.assign(this, data);
  this._id = "profile123";
  this.save = saveMock;
}

CommuteProfileMock.find = findMock;
CommuteProfileMock.findOne = findOneMock;
CommuteProfileMock.findOneAndUpdate = findOneAndUpdateMock;
CommuteProfileMock.deleteOne = deleteOneMock;

// Mock chaining methods
findMock.mockReturnValue({ sort: sortMock });
sortMock.mockReturnValue({ exec: execMock });
findOneMock.mockReturnValue({ exec: execMock });

jest.mock("../src/models/CommuteProfile.model", () => CommuteProfileMock);

// ─── Import service AFTER mocks are in place ────────────────────────────────
const { CommuteProfileService } = require("../src/services/commuteProfile.service");

// ─── Test data ───────────────────────────────────────────────────────────────
const mockProfileData = {
  name: "Test Commute",
  destinations: [
    {
      label: "Work",
      lat: 35.9132,
      lng: -79.0558,
      mode: "drive",
      window: "08:00-09:30",
      maxMinutes: 45,
    },
  ],
  maxMinutes: 60,
  combine: "intersect",
};

const mockProfile = {
  _id: "60d0fe4f5311236168a109ca",
  userId: "60d0fe4f5311236168a109cb",
  ...mockProfileData,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CommuteProfileService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createProfile", () => {
    it("creates a new profile successfully", async () => {
      saveMock.mockResolvedValueOnce(mockProfile);

      const result = await CommuteProfileService.createProfile("60d0fe4f5311236168a109cb", mockProfileData);

      expect(result).toEqual(mockProfile);
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe("getUserProfiles", () => {
    it("retrieves user profiles with correct sort order", async () => {
      const profiles = [mockProfile];
      execMock.mockResolvedValueOnce(profiles);

      const result = await CommuteProfileService.getUserProfiles("60d0fe4f5311236168a109cb");

      expect(findMock).toHaveBeenCalledWith({ userId: new Types.ObjectId("60d0fe4f5311236168a109cb") });
      expect(sortMock).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(result).toEqual(profiles);
    });
  });

  describe("getProfileById", () => {
    it("retrieves profile by ID with user filter", async () => {
      execMock.mockResolvedValueOnce(mockProfile);

      const result = await CommuteProfileService.getProfileById("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");

      expect(findOneMock).toHaveBeenCalledWith({
        _id: new Types.ObjectId("60d0fe4f5311236168a109ca"),
        userId: new Types.ObjectId("60d0fe4f5311236168a109cb"),
      });
      expect(result).toEqual(mockProfile);
    });

    it("retrieves profile by ID without user filter", async () => {
      execMock.mockResolvedValueOnce(mockProfile);

      const result = await CommuteProfileService.getProfileById("60d0fe4f5311236168a109ca");

      expect(findOneMock).toHaveBeenCalledWith({
        _id: new Types.ObjectId("60d0fe4f5311236168a109ca"),
      });
      expect(result).toEqual(mockProfile);
    });
  });

  describe("updateProfile", () => {
    it("updates profile successfully", async () => {
      const updateData = { name: "Updated Name" };
      const updatedProfile = { ...mockProfile, ...updateData };
      findOneAndUpdateMock.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedProfile) });

      const result = await CommuteProfileService.updateProfile("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb", updateData);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId("60d0fe4f5311236168a109ca"),
          userId: new Types.ObjectId("60d0fe4f5311236168a109cb"),
        },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedProfile);
    });
  });

  describe("deleteProfile", () => {
    it("deletes profile successfully", async () => {
      deleteOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await CommuteProfileService.deleteProfile("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");

      expect(deleteOneMock).toHaveBeenCalledWith({
        _id: new Types.ObjectId("60d0fe4f5311236168a109ca"),
        userId: new Types.ObjectId("60d0fe4f5311236168a109cb"),
      });
      expect(result).toBe(true);
    });

    it("returns false when profile not found", async () => {
      deleteOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await CommuteProfileService.deleteProfile("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");

      expect(result).toBe(false);
    });
  });

  describe("isProfileOwner", () => {
    it("returns true when user owns the profile", async () => {
      execMock.mockResolvedValueOnce(mockProfile);

      const result = await CommuteProfileService.isProfileOwner("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");

      expect(findOneMock).toHaveBeenCalledWith({
        _id: new Types.ObjectId("60d0fe4f5311236168a109ca"),
        userId: new Types.ObjectId("60d0fe4f5311236168a109cb"),
      });
      expect(result).toBe(true);
    });

    it("returns false when user does not own the profile", async () => {
      execMock.mockResolvedValueOnce(null);

      const result = await CommuteProfileService.isProfileOwner("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");

      expect(result).toBe(false);
    });
  });

  describe("validateProfileData", () => {
    it("returns no errors for valid data", () => {
      const errors = CommuteProfileService.validateProfileData(mockProfileData);
      expect(errors).toEqual([]);
    });

    it("validates destination count", () => {
      const invalidData = { ...mockProfileData, destinations: [] };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("A profile must have between 1 and 3 destinations");
    });

    it("validates destination labels", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], label: "" }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Label is required");
    });

    it("validates latitude range", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], lat: 91 }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Latitude must be between -90 and 90");
    });

    it("validates longitude range", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], lng: 181 }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Longitude must be between -180 and 180");
    });

    it("validates transportation mode", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], mode: "invalid" }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Mode must be one of: drive, transit, bike, walk");
    });

    it("validates time window format", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], window: "invalid" }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Time window must be in HH:MM-HH:MM format");
    });

    it("validates maxMinutes range for destinations", () => {
      const invalidData = {
        ...mockProfileData,
        destinations: [{ ...mockProfileData.destinations[0], maxMinutes: 200 }],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Destination 1: Maximum minutes must be between 1 and 180");
    });

    it("validates global maxMinutes range", () => {
      const invalidData = { ...mockProfileData, maxMinutes: 0 };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Global maximum minutes must be between 1 and 180");
    });

    it("validates combine method", () => {
      const invalidData = { ...mockProfileData, combine: "invalid" };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      expect(errors).toContain("Combine method must be either 'intersect' or 'union'");
    });

    it("validates multiple destinations with various errors", () => {
      const invalidData = {
        name: "Test",
        destinations: [
          { label: "", lat: 91, lng: 181, mode: "invalid", window: "bad" },
          { label: "Good", lat: 35, lng: -79, mode: "drive", window: "08:00-09:00" },
        ],
      };
      const errors = CommuteProfileService.validateProfileData(invalidData);
      
      expect(errors).toContain("Destination 1: Label is required");
      expect(errors).toContain("Destination 1: Latitude must be between -90 and 90");
      expect(errors).toContain("Destination 1: Longitude must be between -180 and 180");
      expect(errors).toContain("Destination 1: Mode must be one of: drive, transit, bike, walk");
      expect(errors).toContain("Destination 1: Time window must be in HH:MM-HH:MM format");
      expect(errors.length).toBe(5); // Only destination 1 should have errors
    });
  });
});