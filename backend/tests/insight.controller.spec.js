/**
 * @jest-environment node
 */

const httpMocks = require("node-mocks-http");

const insightsMock = jest.fn();
const rebuildMock = jest.fn();

jest.mock("../src/services/insightHdf5.service", () => ({
  getMarketInsights: (...args) => insightsMock(...args),
  rebuildMarketInsights: (...args) => rebuildMock(...args),
}));

const {
  fetchMarketInsights,
  rebuildMarketInsightsHandler,
} = require("../src/controllers/insight.controller");

describe("insight.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  it("responds with data when insights are available", async () => {
    const payload = { cityPriceSummary: [] };
    insightsMock.mockResolvedValueOnce(payload);

    const req = httpMocks.createRequest();
    const res = buildRes();

    await fetchMarketInsights(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it("handles errors from the insight reader", async () => {
    insightsMock.mockRejectedValueOnce(new Error("boom"));

    const req = httpMocks.createRequest();
    const res = buildRes();

    await fetchMarketInsights(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to load market insights",
    });
  });

  it("returns rebuild confirmation payload", async () => {
    const payload = { message: "ok", propertyCount: 1 };
    rebuildMock.mockResolvedValueOnce(payload);

    const req = httpMocks.createRequest();
    const res = buildRes();

    await rebuildMarketInsightsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it("handles rebuild errors", async () => {
    rebuildMock.mockRejectedValueOnce(new Error("nope"));

    const req = httpMocks.createRequest();
    const res = buildRes();

    await rebuildMarketInsightsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to rebuild market insights archive",
    });
  });
});
