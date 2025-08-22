/**
 * @jest-environment node
 */
process.env.JWT_SECRET = "irrelevant";
process.env.GOOGLE_AI_API_KEY = "test-key";
process.env.PINECONE_API_KEY = "test-pinecone-key";
process.env.PINECONE_ENVIRONMENT = "test-env";
process.env.PINECONE_INDEX = "test-index";

/* ─── mock mongoose ───────────────────────────────────────────── */
const ObjectIdMock = function (v) {
  if (!(this instanceof ObjectIdMock)) return v;
  return v;
};
jest.mock("mongoose", () => {
  const core = { Types: { ObjectId: ObjectIdMock } };
  return { __esModule: true, ...core, default: core };
});

/* ─── mock enhanced agent services ─────────────────────────────── */
jest.mock("../src/services/enhancedGeminiAgent.service", () => ({
  runEnhancedEstateWiseAgent: jest.fn().mockResolvedValue({
    finalText: "Enhanced agent response",
    expertViews: { "Data Analyst": "Enhanced analysis" },
    needsDisambiguation: false,
    intentClassification: {
      primaryIntent: "PROPERTY_INQUIRY",
      confidence: 0.9,
      alternativeIntents: []
    }
  }),
  getIntentTelemetryService: jest.fn().mockReturnValue(null),
  getDisambiguationService: jest.fn().mockReturnValue(null),
}));

/* ─── helpers ─────────────────────────────────────────────────── */
const httpMocks = require("node-mocks-http");
const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

/* ─── Conversation model mock ────────────────────────────────── */
const saveMock = jest.fn().mockResolvedValue(null);
let findOneMock = jest.fn();

function ConversationMock(data = {}) {
  Object.assign(this, data);
  this._id = data._id || "conv123";
  this.messages = data.messages || [];
  this.expertWeights = data.expertWeights || {
    "Data Analyst": 1,
    "Lifestyle Concierge": 1,
    "Financial Advisor": 1,
    "Neighborhood Expert": 1,
    "Cluster Analyst": 1,
  };
  this.save = saveMock;
  this.markModified = jest.fn();
}
ConversationMock.findOne = (...args) => findOneMock(...args);
jest.mock("../src/models/Conversation.model", () => ConversationMock);

/* ─── Gemini service mock ────────────────────────────────────── */
const chatWithEstateWise = jest
  .fn()
  .mockResolvedValue({ finalText: "bot reply", expertViews: { A: 0.5 } });
jest.mock("../src/services/geminiChat.service", () => ({ chatWithEstateWise }));

/* ─── controller under test ──────────────────────────────────── */
const {
  chat,
  rateConversation,
} = require("../src/controllers/chat.controller");

/* ═══════════════════════════════════════════════════════════════
   CHAT ENDPOINT TESTS
   ═══════════════════════════════════════════════════════════════ */
describe("chat()", () => {
  let consoleSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleSpy.mockRestore());

  it("guest flow returns bot reply & weights", async () => {
    const req = httpMocks.createRequest({
      body: {
        message: "hello",
        history: [{ role: "sys", parts: [{ text: "init" }] }],
        expertWeights: { "Data Analyst": 2 },
        useEnhancedAgent: false, // Use legacy agent for this test
      },
    });
    const res = buildRes();

    await chat(req, res);

    expect(chatWithEstateWise).toHaveBeenCalledWith(
      [
        { role: "sys", parts: [{ text: "init" }] },
        { role: "user", parts: [{ text: "hello" }] },
      ],
      "hello",
      {},
      expect.objectContaining({ "Data Analyst": 2 }),
    );
    expect(res.json).toHaveBeenCalledWith({
      response: "bot reply",
      expertViews: { A: 0.5 },
      expertWeights: expect.objectContaining({ "Data Analyst": 2 }),
    });
  });

  it("creates a new conversation for auth user", async () => {
    findOneMock.mockResolvedValueOnce(null);

    const req = httpMocks.createRequest({ 
      body: { 
        message: "yo",
        useEnhancedAgent: false // Use legacy agent for this test
      } 
    });
    req.user = { id: "u1" };
    const res = buildRes();

    await chat(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(chatWithEstateWise).toHaveBeenCalledWith(
      [{ role: "user", parts: [{ text: "yo" }] }],
      "yo",
      {},
      expect.any(Object),
    );
    expect(res.json).toHaveBeenCalledWith({
      response: "bot reply",
      expertViews: { A: 0.5 },
      convoId: "conv123",
      expertWeights: expect.any(Object),
    });
  });

  it("internal error → 500", async () => {
    chatWithEstateWise.mockRejectedValueOnce(new Error("boom"));
    const req = httpMocks.createRequest({ 
      body: { 
        message: "oops",
        useEnhancedAgent: false // Use legacy agent for this test
      } 
    });
    req.user = { id: "u1" };
    const res = buildRes();

    await chat(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Error processing chat request",
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   RATE-CONVERSATION TESTS
   ═══════════════════════════════════════════════════════════════ */
describe("rateConversation()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("guest thumbs-up → success", async () => {
    const req = httpMocks.createRequest({ body: { rating: "up" } });
    const res = buildRes();
    await rateConversation(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("guest thumbs-down adjusts weights", async () => {
    const req = httpMocks.createRequest({
      body: {
        rating: "down",
        expertWeights: { X: 1, Y: 1, "Cluster Analyst": 2 },
      },
    });
    const res = buildRes();
    await rateConversation(req, res);

    const out = res.json.mock.calls[0][0];
    expect(out.success).toBe(true);
    expect(out.expertWeights["Cluster Analyst"]).toBe(1);
  });

  it("auth user missing convoId → 400", async () => {
    const req = httpMocks.createRequest({ body: { rating: "up" } });
    req.user = { id: "u1" };
    const res = buildRes();
    await rateConversation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
