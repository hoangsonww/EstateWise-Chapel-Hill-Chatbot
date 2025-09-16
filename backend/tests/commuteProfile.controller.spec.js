/**
 * @jest-environment node
 */

const httpMocks = require("node-mocks-http");

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

// ─── Mock the service (we'll test service separately) ────────────────────────
const mockCreateProfile = jest.fn();
const mockGetUserProfiles = jest.fn();
const mockGetProfileById = jest.fn();
const mockUpdateProfile = jest.fn();
const mockDeleteProfile = jest.fn();
const mockValidateProfileData = jest.fn();

jest.mock("../src/services/commuteProfile.service", () => ({
  CommuteProfileService: {
    createProfile: mockCreateProfile,
    getUserProfiles: mockGetUserProfiles,
    getProfileById: mockGetProfileById,
    updateProfile: mockUpdateProfile,
    deleteProfile: mockDeleteProfile,
    validateProfileData: mockValidateProfileData,
  },
}));

// ─── Import controllers AFTER mocks are in place ───────────────────────────
const {
  createCommuteProfile,
  getCommuteProfiles,
  getCommuteProfile,
  updateCommuteProfile,
  deleteCommuteProfile,
} = require("../src/controllers/commuteProfile.controller");

// ─── Helper to build a spy‐able Express response ───────────────────────────
function buildRes() {
  const res = httpMocks.createResponse({
    eventEmitter: require("events").EventEmitter,
  });
  jest.spyOn(res, "status");
  jest.spyOn(res, "json");
  return res;
}

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

describe("CommuteProfile Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateProfileData.mockReturnValue([]); // No validation errors by default
  });

  describe("createCommuteProfile", () => {
    it("creates a profile successfully with valid data", async () => {
      const req = httpMocks.createRequest({
        body: mockProfileData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockCreateProfile.mockResolvedValueOnce(mockProfile);

      await createCommuteProfile(req, res);

      expect(mockValidateProfileData).toHaveBeenCalledWith(mockProfileData);
      expect(mockCreateProfile).toHaveBeenCalledWith("60d0fe4f5311236168a109cb", mockProfileData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Commute profile created successfully",
        profile: mockProfile,
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = httpMocks.createRequest({
        body: mockProfileData,
      });
      const res = buildRes();

      await createCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
      expect(mockCreateProfile).not.toHaveBeenCalled();
    });

    it("returns 400 when validation fails", async () => {
      const req = httpMocks.createRequest({
        body: mockProfileData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      const validationErrors = ["Profile name is required"];
      mockValidateProfileData.mockReturnValueOnce(validationErrors);

      await createCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: validationErrors,
      });
      expect(mockCreateProfile).not.toHaveBeenCalled();
    });

    it("returns 409 when profile name already exists", async () => {
      const req = httpMocks.createRequest({
        body: mockProfileData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      const duplicateError = new Error("Duplicate key error");
      duplicateError.code = 11000;
      duplicateError.keyPattern = { name: 1 };
      mockCreateProfile.mockRejectedValueOnce(duplicateError);

      await createCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "A profile with this name already exists for your account",
      });
    });

    it("returns 500 on unexpected error", async () => {
      const req = httpMocks.createRequest({
        body: mockProfileData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockCreateProfile.mockRejectedValueOnce(new Error("Database error"));

      await createCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to create commute profile",
      });
    });
  });

  describe("getCommuteProfiles", () => {
    it("retrieves user profiles successfully", async () => {
      const req = httpMocks.createRequest({
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      const profiles = [mockProfile];
      mockGetUserProfiles.mockResolvedValueOnce(profiles);

      await getCommuteProfiles(req, res);

      expect(mockGetUserProfiles).toHaveBeenCalledWith("60d0fe4f5311236168a109cb");
      expect(res.json).toHaveBeenCalledWith({
        message: "Commute profiles retrieved successfully",
        profiles,
        count: 1,
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = httpMocks.createRequest({});
      const res = buildRes();

      await getCommuteProfiles(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
    });

    it("returns 500 on database error", async () => {
      const req = httpMocks.createRequest({
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetUserProfiles.mockRejectedValueOnce(new Error("Database error"));

      await getCommuteProfiles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve commute profiles",
      });
    });
  });

  describe("getCommuteProfile", () => {
    it("retrieves a specific profile successfully", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(mockProfile);

      await getCommuteProfile(req, res);

      expect(mockGetProfileById).toHaveBeenCalledWith("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");
      expect(res.json).toHaveBeenCalledWith({
        message: "Commute profile retrieved successfully",
        profile: mockProfile,
      });
    });

    it("returns 404 when profile not found", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109dd" },
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(null);

      await getCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Commute profile not found",
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
      });
      const res = buildRes();

      await getCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
    });
  });

  describe("updateCommuteProfile", () => {
    const updateData = { name: "Updated Commute" };

    it("updates profile successfully", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
        body: updateData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      const updatedProfile = { ...mockProfile, ...updateData };
      mockGetProfileById.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      await updateCommuteProfile(req, res);

      expect(mockValidateProfileData).toHaveBeenCalledWith(updateData);
      expect(mockGetProfileById).toHaveBeenCalledWith("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");
      expect(mockUpdateProfile).toHaveBeenCalledWith("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb", updateData);
      expect(res.json).toHaveBeenCalledWith({
        message: "Commute profile updated successfully",
        profile: updatedProfile,
      });
    });

    it("returns 404 when profile not found", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109dd" },
        body: updateData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(null);

      await updateCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Commute profile not found",
      });
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("returns 400 when validation fails", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
        body: updateData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      const validationErrors = ["Invalid data"];
      mockValidateProfileData.mockReturnValueOnce(validationErrors);

      await updateCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: validationErrors,
      });
      expect(mockGetProfileById).not.toHaveBeenCalled();
    });

    it("returns 409 when updated name conflicts", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
        body: updateData,
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(mockProfile);
      
      const duplicateError = new Error("Duplicate key error");
      duplicateError.code = 11000;
      duplicateError.keyPattern = { name: 1 };
      mockUpdateProfile.mockRejectedValueOnce(duplicateError);

      await updateCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "A profile with this name already exists for your account",
      });
    });
  });

  describe("deleteCommuteProfile", () => {
    it("deletes profile successfully", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(mockProfile);
      mockDeleteProfile.mockResolvedValueOnce(true);

      await deleteCommuteProfile(req, res);

      expect(mockGetProfileById).toHaveBeenCalledWith("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");
      expect(mockDeleteProfile).toHaveBeenCalledWith("60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb");
      expect(res.json).toHaveBeenCalledWith({
        message: "Commute profile deleted successfully",
      });
    });

    it("returns 404 when profile not found", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109dd" },
        user: { id: "60d0fe4f5311236168a109cb" },
      });
      const res = buildRes();

      mockGetProfileById.mockResolvedValueOnce(null);

      await deleteCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Commute profile not found",
      });
      expect(mockDeleteProfile).not.toHaveBeenCalled();
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = httpMocks.createRequest({
        params: { id: "60d0fe4f5311236168a109ca" },
      });
      const res = buildRes();

      await deleteCommuteProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
    });
  });
});