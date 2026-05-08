process.env.JWT_SECRET = "testsecret";
process.env.WEBAUTHN_RP_ID = "localhost";
process.env.WEBAUTHN_RP_NAME = "EstateWise";
process.env.WEBAUTHN_ORIGINS = "http://localhost:3000";

const httpMocks = require("node-mocks-http");

// ─── Mock @simplewebauthn/server ─────────────────────────────────────────
const generateRegistrationOptionsMock = jest.fn();
const verifyRegistrationResponseMock = jest.fn();
const generateAuthenticationOptionsMock = jest.fn();
const verifyAuthenticationResponseMock = jest.fn();
jest.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: (...a) => generateRegistrationOptionsMock(...a),
  verifyRegistrationResponse: (...a) => verifyRegistrationResponseMock(...a),
  generateAuthenticationOptions: (...a) =>
    generateAuthenticationOptionsMock(...a),
  verifyAuthenticationResponse: (...a) =>
    verifyAuthenticationResponseMock(...a),
}));

// ─── Mock jsonwebtoken ────────────────────────────────────────────────────
const jwtSignMock = jest.fn(() => "jwt.token.123");
jest.mock("jsonwebtoken", () => ({ sign: jwtSignMock, verify: jest.fn() }));

// ─── Mock User model ──────────────────────────────────────────────────────
const userSaveMock = jest.fn().mockResolvedValue();
const userFindByIdMock = jest.fn();
const userFindOneMock = jest.fn();

function makeUser(overrides = {}) {
  const credentials = overrides.credentials || [];
  // Mongoose subdoc array shim with `.id()` and `.push()` semantics
  Object.defineProperty(credentials, "id", {
    value: function (id) {
      return this.find((c) => String(c._id) === String(id)) || null;
    },
    enumerable: false,
  });
  if (typeof credentials.push !== "function") {
    credentials.push = Array.prototype.push.bind(credentials);
  }
  return {
    _id: overrides._id || "u123",
    username: overrides.username || "alice",
    email: overrides.email || "alice@example.com",
    credentials,
    save: userSaveMock,
  };
}

const UserMock = {
  findById: (...a) => userFindByIdMock(...a),
  findOne: (...a) => userFindOneMock(...a),
};
jest.mock("../src/models/User.model", () => ({
  __esModule: true,
  default: UserMock,
}));

// ─── Mock challenge model ──────────────────────────────────────────────────
const challengeUpsertMock = jest.fn().mockResolvedValue({});
const challengeDeleteMock = jest.fn();
jest.mock("../src/models/WebAuthnChallenge.model", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...a) => challengeUpsertMock(...a),
    findOneAndDelete: (...a) => challengeDeleteMock(...a),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────
const {
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  listCredentials,
  renameCredential,
  deleteCredential,
} = require("../src/controllers/webauthn.controller");

function buildRes() {
  const res = httpMocks.createResponse({
    eventEmitter: require("events").EventEmitter,
  });
  jest.spyOn(res, "status");
  jest.spyOn(res, "json");
  jest.spyOn(res, "cookie");
  return res;
}

const futureDate = () => new Date(Date.now() + 5 * 60 * 1000);
const pastDate = () => new Date(Date.now() - 1000);

describe("WebAuthn Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── registrationOptions ─────────────────────────────────────────────────
  describe("registrationOptions", () => {
    it("401 if not authenticated", async () => {
      const req = httpMocks.createRequest({});
      const res = buildRes();
      await registrationOptions(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns options and persists challenge", async () => {
      const user = makeUser();
      userFindByIdMock.mockResolvedValueOnce(user);
      generateRegistrationOptionsMock.mockResolvedValueOnce({
        challenge: "ch-1",
        rp: {},
        user: {},
      });

      const req = httpMocks.createRequest({ user: { id: "u123" } });
      const res = buildRes();
      await registrationOptions(req, res);

      expect(generateRegistrationOptionsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rpID: "localhost",
          rpName: "EstateWise",
          userName: "alice@example.com",
        }),
      );
      expect(challengeUpsertMock).toHaveBeenCalledWith(
        { key: "reg:u123" },
        expect.objectContaining({
          key: "reg:u123",
          challenge: "ch-1",
          type: "registration",
        }),
        expect.objectContaining({ upsert: true }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ challenge: "ch-1" }),
      );
    });

    it("excludes already-registered credentials", async () => {
      const user = makeUser({
        credentials: [
          { _id: "c1", credentialID: "cid-1", transports: ["internal"] },
        ],
      });
      userFindByIdMock.mockResolvedValueOnce(user);
      generateRegistrationOptionsMock.mockResolvedValueOnce({
        challenge: "ch-1",
      });

      const req = httpMocks.createRequest({ user: { id: "u123" } });
      const res = buildRes();
      await registrationOptions(req, res);

      const args = generateRegistrationOptionsMock.mock.calls[0][0];
      expect(args.excludeCredentials).toEqual([
        { id: "cid-1", transports: ["internal"] },
      ]);
    });
  });

  // ─── registrationVerify ──────────────────────────────────────────────────
  describe("registrationVerify", () => {
    it("400 when challenge expired/missing", async () => {
      const user = makeUser();
      userFindByIdMock.mockResolvedValueOnce(user);
      challengeDeleteMock.mockResolvedValueOnce(null);

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        body: { response: { id: "x" } },
      });
      const res = buildRes();
      await registrationVerify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("persists credential on successful verification", async () => {
      const user = makeUser();
      userFindByIdMock.mockResolvedValueOnce(user);
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch-1",
        expiresAt: futureDate(),
      });
      verifyRegistrationResponseMock.mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: "new-cid",
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
          },
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
        },
      });
      userFindOneMock.mockResolvedValueOnce(null); // no duplicate

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        body: {
          response: { id: "new-cid", response: { transports: ["internal"] } },
          nickname: "MacBook",
        },
      });
      const res = buildRes();
      await registrationVerify(req, res);

      expect(userSaveMock).toHaveBeenCalled();
      expect(user.credentials).toHaveLength(1);
      expect(user.credentials[0]).toMatchObject({
        credentialID: "new-cid",
        counter: 0,
        nickname: "MacBook",
        transports: ["internal"],
        deviceType: "multiDevice",
        backedUp: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejects when verification fails", async () => {
      const user = makeUser();
      userFindByIdMock.mockResolvedValueOnce(user);
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      verifyRegistrationResponseMock.mockResolvedValueOnce({ verified: false });

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        body: { response: { id: "cid", response: {} } },
      });
      const res = buildRes();
      await registrationVerify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects credential already registered to another user", async () => {
      const user = makeUser();
      userFindByIdMock.mockResolvedValueOnce(user);
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      verifyRegistrationResponseMock.mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: { id: "dup", publicKey: new Uint8Array(), counter: 0 },
          credentialDeviceType: "singleDevice",
          credentialBackedUp: false,
        },
      });
      userFindOneMock.mockResolvedValueOnce({ _id: "other-user" });

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        body: { response: { id: "dup", response: {} } },
      });
      const res = buildRes();
      await registrationVerify(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ─── authenticationOptions ───────────────────────────────────────────────
  describe("authenticationOptions", () => {
    it("scopes allowCredentials when email is provided", async () => {
      const user = makeUser({
        credentials: [
          { credentialID: "cid-1", transports: ["internal", "hybrid"] },
        ],
      });
      userFindOneMock.mockResolvedValueOnce(user);
      generateAuthenticationOptionsMock.mockResolvedValueOnce({
        challenge: "auth-ch",
      });

      const req = httpMocks.createRequest({
        body: { email: "alice@example.com" },
      });
      const res = buildRes();
      await authenticationOptions(req, res);

      const args = generateAuthenticationOptionsMock.mock.calls[0][0];
      expect(args.allowCredentials).toEqual([
        { id: "cid-1", transports: ["internal", "hybrid"] },
      ]);
      expect(challengeUpsertMock).toHaveBeenCalledWith(
        { key: "auth:email:alice@example.com" },
        expect.objectContaining({ challenge: "auth-ch" }),
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ challenge: "auth-ch" }),
      );
    });

    it("uses discoverable flow when email omitted", async () => {
      generateAuthenticationOptionsMock.mockResolvedValueOnce({
        challenge: "disc-ch",
      });

      const req = httpMocks.createRequest({ body: {} });
      const res = buildRes();
      await authenticationOptions(req, res);

      const args = generateAuthenticationOptionsMock.mock.calls[0][0];
      expect(args.allowCredentials).toEqual([]);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          challenge: "disc-ch",
          sessionId: expect.any(String),
        }),
      );
    });

    it("doesn't reveal whether the email exists", async () => {
      userFindOneMock.mockResolvedValueOnce(null);
      generateAuthenticationOptionsMock.mockResolvedValueOnce({
        challenge: "auth-ch",
      });

      const req = httpMocks.createRequest({
        body: { email: "ghost@example.com" },
      });
      const res = buildRes();
      await authenticationOptions(req, res);

      // Still 200, with empty allowCredentials
      expect(res.statusCode).toBe(200);
      const args = generateAuthenticationOptionsMock.mock.calls[0][0];
      expect(args.allowCredentials).toEqual([]);
    });
  });

  // ─── authenticationVerify ────────────────────────────────────────────────
  describe("authenticationVerify", () => {
    it("400 when neither email nor sessionId given", async () => {
      const req = httpMocks.createRequest({
        body: { response: { id: "cid" } },
      });
      const res = buildRes();
      await authenticationVerify(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("400 when challenge expired", async () => {
      challengeDeleteMock.mockResolvedValueOnce(null);

      const req = httpMocks.createRequest({
        body: {
          response: { id: "cid" },
          email: "alice@example.com",
        },
      });
      const res = buildRes();
      await authenticationVerify(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("404 when credentialID not recognized", async () => {
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      userFindOneMock.mockResolvedValueOnce(null);

      const req = httpMocks.createRequest({
        body: {
          response: { id: "unknown-cid" },
          email: "alice@example.com",
        },
      });
      const res = buildRes();
      await authenticationVerify(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("issues JWT on successful verification + bumps counter", async () => {
      const credential = {
        _id: "c1",
        credentialID: "cid-1",
        publicKey: Buffer.from([1, 2]),
        counter: 5,
        transports: ["internal"],
      };
      const user = makeUser({ credentials: [credential] });
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      userFindOneMock.mockResolvedValueOnce(user);
      verifyAuthenticationResponseMock.mockResolvedValueOnce({
        verified: true,
        authenticationInfo: { newCounter: 6, credentialID: "cid-1" },
      });

      const req = httpMocks.createRequest({
        body: {
          response: { id: "cid-1" },
          email: "alice@example.com",
        },
      });
      const res = buildRes();
      await authenticationVerify(req, res);

      expect(credential.counter).toBe(6);
      expect(userSaveMock).toHaveBeenCalled();
      expect(jwtSignMock).toHaveBeenCalledWith(
        { id: "u123", email: "alice@example.com" },
        "testsecret",
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "token",
        "jwt.token.123",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "jwt.token.123",
          user: { username: "alice", email: "alice@example.com" },
        }),
      );
    });

    it("401 when credential mismatches scoped email", async () => {
      const credential = {
        credentialID: "cid-1",
        publicKey: Buffer.from([]),
        counter: 0,
        transports: [],
      };
      const user = makeUser({
        email: "bob@example.com",
        credentials: [credential],
      });
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      userFindOneMock.mockResolvedValueOnce(user);

      const req = httpMocks.createRequest({
        body: {
          response: { id: "cid-1" },
          email: "alice@example.com",
        },
      });
      const res = buildRes();
      await authenticationVerify(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("401 when verifyAuthenticationResponse returns false", async () => {
      const credential = {
        credentialID: "cid-1",
        publicKey: Buffer.from([]),
        counter: 0,
        transports: [],
      };
      const user = makeUser({ credentials: [credential] });
      challengeDeleteMock.mockResolvedValueOnce({
        challenge: "ch",
        expiresAt: futureDate(),
      });
      userFindOneMock.mockResolvedValueOnce(user);
      verifyAuthenticationResponseMock.mockResolvedValueOnce({
        verified: false,
      });

      const req = httpMocks.createRequest({
        body: {
          response: { id: "cid-1" },
          email: "alice@example.com",
        },
      });
      const res = buildRes();
      await authenticationVerify(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── credential management ───────────────────────────────────────────────
  describe("listCredentials", () => {
    it("returns serialized credentials", async () => {
      const user = makeUser({
        credentials: [
          {
            _id: "c1",
            credentialID: "cid",
            nickname: "MacBook",
            transports: ["internal"],
            deviceType: "multiDevice",
            backedUp: true,
            createdAt: new Date("2026-01-01"),
            lastUsedAt: new Date("2026-01-02"),
          },
        ],
      });
      userFindByIdMock.mockReturnValueOnce({
        select: () => Promise.resolve(user),
      });

      const req = httpMocks.createRequest({ user: { id: "u123" } });
      const res = buildRes();
      await listCredentials(req, res);

      expect(res.json).toHaveBeenCalledWith({
        credentials: [
          expect.objectContaining({
            id: "c1",
            credentialID: "cid",
            nickname: "MacBook",
          }),
        ],
      });
    });
  });

  describe("renameCredential", () => {
    it("400 if nickname missing", async () => {
      const req = httpMocks.createRequest({
        user: { id: "u123" },
        params: { id: "c1" },
        body: {},
      });
      const res = buildRes();
      await renameCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("renames the credential", async () => {
      const cred = { _id: "c1", credentialID: "cid", nickname: "old" };
      const user = makeUser({ credentials: [cred] });
      userFindByIdMock.mockResolvedValueOnce(user);

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        params: { id: "c1" },
        body: { nickname: "shiny new name" },
      });
      const res = buildRes();
      await renameCredential(req, res);

      expect(cred.nickname).toBe("shiny new name");
      expect(userSaveMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.objectContaining({ nickname: "shiny new name" }),
        }),
      );
    });
  });

  describe("deleteCredential", () => {
    it("removes the matching credential", async () => {
      const cred = {
        _id: "c1",
        credentialID: "cid",
        deleteOne: jest.fn(),
      };
      const user = makeUser({ credentials: [cred] });
      userFindByIdMock.mockResolvedValueOnce(user);

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        params: { id: "c1" },
      });
      const res = buildRes();
      await deleteCredential(req, res);

      expect(cred.deleteOne).toHaveBeenCalled();
      expect(userSaveMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Passkey removed" });
    });

    it("404 when credential id unknown", async () => {
      const user = makeUser({ credentials: [] });
      userFindByIdMock.mockResolvedValueOnce(user);

      const req = httpMocks.createRequest({
        user: { id: "u123" },
        params: { id: "missing" },
      });
      const res = buildRes();
      await deleteCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
