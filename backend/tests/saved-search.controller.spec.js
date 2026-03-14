const {
  createSavedSearch,
  getSavedSearches,
  getSavedSearchById,
  updateSavedSearch,
  deleteSavedSearch,
} = require("../src/controllers/savedSearch.controller");
const { SavedSearchService } = require("../src/services/savedSearch.service");

jest.mock("../src/services/savedSearch.service");
const MockedSavedSearchService = SavedSearchService;

describe("SavedSearchController", () => {
  let mockReq, mockRes;

  const userId = "507f1f77bcf86cd799439012";
  const searchId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { id: userId },
      body: {},
      params: { id: searchId },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("createSavedSearch", () => {
    it("should create a saved search and return 201", async () => {
      const requestBody = {
        name: "2BR Chapel Hill",
        query: "2 bedroom Chapel Hill under 500000",
        frequency: "daily",
        alertTypes: ["new_match"],
      };
      mockReq.body = requestBody;

      const expectedResponse = {
        _id: searchId,
        userId,
        name: "2BR Chapel Hill",
        query: "2 bedroom Chapel Hill under 500000",
        frequency: "daily",
        alertTypes: ["new_match"],
        lastRunAt: null,
        lastResultIds: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      MockedSavedSearchService.prototype.create = jest
        .fn()
        .mockResolvedValue(expectedResponse);

      await createSavedSearch(mockReq, mockRes);

      expect(MockedSavedSearchService.prototype.create).toHaveBeenCalledWith(
        userId,
        requestBody,
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe("getSavedSearches", () => {
    it("should return all saved searches for the user", async () => {
      const expectedSearches = [
        {
          _id: searchId,
          userId,
          name: "Search 1",
          query: "2BR",
          frequency: "daily",
          alertTypes: ["new_match"],
          lastRunAt: null,
          lastResultIds: [],
        },
      ];

      MockedSavedSearchService.prototype.listForUser = jest
        .fn()
        .mockResolvedValue(expectedSearches);

      await getSavedSearches(mockReq, mockRes);

      expect(
        MockedSavedSearchService.prototype.listForUser,
      ).toHaveBeenCalledWith(userId);
      expect(mockRes.json).toHaveBeenCalledWith(expectedSearches);
    });
  });

  describe("getSavedSearchById", () => {
    it("should return a specific saved search by ID", async () => {
      const expectedSearch = {
        _id: searchId,
        userId,
        name: "Search 1",
        query: "2BR",
        frequency: "daily",
        alertTypes: ["new_match"],
        lastRunAt: null,
        lastResultIds: [],
      };

      MockedSavedSearchService.prototype.getById = jest
        .fn()
        .mockResolvedValue(expectedSearch);

      await getSavedSearchById(mockReq, mockRes);

      expect(MockedSavedSearchService.prototype.getById).toHaveBeenCalledWith(
        searchId,
        userId,
      );
      expect(mockRes.json).toHaveBeenCalledWith(expectedSearch);
    });
  });

  describe("updateSavedSearch", () => {
    it("should update a saved search and return updated data", async () => {
      const updateData = { name: "Updated Search", frequency: "hourly" };
      mockReq.body = updateData;

      const expectedResponse = {
        _id: searchId,
        userId,
        name: "Updated Search",
        query: "2BR",
        frequency: "hourly",
        alertTypes: ["new_match"],
        lastRunAt: null,
        lastResultIds: [],
      };

      MockedSavedSearchService.prototype.update = jest
        .fn()
        .mockResolvedValue(expectedResponse);

      await updateSavedSearch(mockReq, mockRes);

      expect(MockedSavedSearchService.prototype.update).toHaveBeenCalledWith(
        searchId,
        userId,
        updateData,
      );
      expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe("deleteSavedSearch", () => {
    it("should delete a saved search and return success message", async () => {
      MockedSavedSearchService.prototype.delete = jest
        .fn()
        .mockResolvedValue(undefined);

      await deleteSavedSearch(mockReq, mockRes);

      expect(MockedSavedSearchService.prototype.delete).toHaveBeenCalledWith(
        searchId,
        userId,
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Saved search deleted successfully",
      });
    });
  });
});
