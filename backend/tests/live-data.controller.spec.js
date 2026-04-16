/**
 * @jest-environment node
 */

const httpMocks = require("node-mocks-http");

const getLiveDataStatus = jest.fn();
const searchLiveListings = jest.fn();

jest.mock("../src/services/liveData.service", () => ({
  getLiveDataStatus: (...args) => getLiveDataStatus(...args),
  searchLiveListings: (...args) => searchLiveListings(...args),
}));

const {
  liveDataStatus,
  liveDataSearch,
} = require("../src/controllers/live-data.controller");

function buildRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("live data controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns live data status payload", () => {
    const payload = { enabled: true, listingCount: 3 };
    getLiveDataStatus.mockReturnValueOnce(payload);
    const req = httpMocks.createRequest();
    const res = buildRes();
    liveDataStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it("falls back to default limit when query limit is invalid", () => {
    searchLiveListings.mockReturnValueOnce({ count: 0, results: [] });
    const req = httpMocks.createRequest({
      query: { q: "chapel hill", limit: "not-a-number" },
    });
    const res = buildRes();
    liveDataSearch(req, res);
    expect(searchLiveListings).toHaveBeenCalledWith("chapel hill", 10);
  });
});
