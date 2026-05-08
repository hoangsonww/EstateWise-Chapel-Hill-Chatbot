import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import User from "../models/User.model";
import WebAuthnChallenge, {
  IWebAuthnChallenge,
} from "../models/WebAuthnChallenge.model";
import { AuthRequest } from "../middleware/auth.middleware";

// ─── Configuration ───────────────────────────────────────────────────────────
//
// RP ID must be the effective domain of the *frontend* (not the backend),
// because the browser binds credentials to the page's origin. For local dev
// use "localhost". For Vercel previews, set explicitly via env.
//
// Origin must match what the browser sends in the client data — exact scheme
// and host (and port if non-default). Multiple origins are supported via a
// comma-separated WEBAUTHN_ORIGINS list (the verifier accepts any of them).
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_NAME = process.env.WEBAUTHN_RP_NAME || "EstateWise";
const ORIGIN_LIST: string[] = (
  process.env.WEBAUTHN_ORIGINS ||
  process.env.WEBAUTHN_ORIGIN ||
  "http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REGISTRATION_TIMEOUT_MS = 60_000;
const AUTHENTICATION_TIMEOUT_MS = 60_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const regKey = (userId: string) => `reg:${userId}`;
const authEmailKey = (email: string) => `auth:email:${email.toLowerCase()}`;
const authDiscKey = (sessionId: string) => `auth:disc:${sessionId}`;

async function storeChallenge(params: {
  key: string;
  challenge: string;
  type: "registration" | "authentication";
  userId?: string;
  email?: string;
}) {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await WebAuthnChallenge.findOneAndUpdate(
    { key: params.key },
    {
      key: params.key,
      challenge: params.challenge,
      type: params.type,
      userId: params.userId ?? null,
      email: params.email ?? null,
      createdAt: new Date(),
      expiresAt,
    },
    { upsert: true, new: true },
  );
}

async function consumeChallenge(key: string) {
  // Mongoose 7 typings model `findOneAndDelete` as returning a `ModifyResult`,
  // so cast to the document shape we know we get back at runtime.
  const doc = (await WebAuthnChallenge.findOneAndDelete({
    key,
  })) as unknown as IWebAuthnChallenge | null;
  if (!doc) return null;
  if (doc.expiresAt.getTime() < Date.now()) return null;
  return doc;
}

function issueAuthToken(user: { _id: unknown; email: string }) {
  return jwt.sign(
    { id: String(user._id), email: user.email },
    process.env.JWT_SECRET!,
  );
}

function setAuthCookie(res: Response, token: string) {
  // Frontend authenticates via Bearer header (cross-origin-friendly), but we
  // also set the cookie to mirror the existing email/password flow. Cross-site
  // cookies require Secure + SameSite=None in production browsers.
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

/**
 * Begin passkey registration. Caller must already be authenticated.
 * Returns PublicKeyCredentialCreationOptionsJSON for the browser SDK.
 */
export const registrationOptions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      // Stable per-user identifier the authenticator binds to. We use the
      // Mongo _id — opaque, stable, never reused.
      userID: new TextEncoder().encode(String(user._id)),
      userName: user.email,
      userDisplayName: user.username || user.email,
      timeout: REGISTRATION_TIMEOUT_MS,
      attestationType: "none",
      // Prevent registering the same authenticator twice.
      excludeCredentials: user.credentials.map((c) => ({
        id: c.credentialID,
        transports: (c.transports || []) as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    await storeChallenge({
      key: regKey(String(user._id)),
      challenge: options.challenge,
      type: "registration",
      userId: String(user._id),
    });

    return res.json(options);
  } catch (err) {
    console.error("[webauthn] registrationOptions failed:", err);
    return res.status(500).json({ error: "Failed to start registration" });
  }
};

/**
 * Verify the registration response and persist the new credential.
 */
export const registrationVerify = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const response = req.body?.response as RegistrationResponseJSON | undefined;
    const nickname: string =
      typeof req.body?.nickname === "string"
        ? req.body.nickname.trim().slice(0, 60)
        : "";
    if (!response) {
      return res.status(400).json({ error: "Missing response" });
    }

    const challengeDoc = await consumeChallenge(regKey(String(user._id)));
    if (!challengeDoc) {
      return res
        .status(400)
        .json({ error: "Challenge expired — please retry" });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: ORIGIN_LIST,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: "Verification failed" });
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Reject duplicate credentialID across the entire user collection
    // (defense-in-depth — excludeCredentials handles same-user case).
    const existing = await User.findOne({
      "credentials.credentialID": credential.id,
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "This passkey is already registered" });
    }

    user.credentials.push({
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: (response.response.transports ?? []) as string[],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname:
        nickname || defaultNicknameForTransports(response.response.transports),
      createdAt: new Date(),
      lastUsedAt: new Date(),
    } as any);

    await user.save();

    return res.status(201).json({
      verified: true,
      credential: serializeCredential(
        user.credentials[user.credentials.length - 1],
      ),
    });
  } catch (err) {
    console.error("[webauthn] registrationVerify failed:", err);
    return res.status(500).json({ error: "Failed to register passkey" });
  }
};

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Begin passkey authentication.
 *
 * If `email` is provided, options scope `allowCredentials` to that user — useful
 * for the classic "type email then tap passkey" flow. Otherwise we issue a
 * discoverable-credential challenge and let the authenticator pick the user
 * (the new "Sign in with a passkey" UX, including conditional autofill).
 */
export const authenticationOptions = async (req: Request, res: Response) => {
  try {
    const email: string =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";

    let allowCredentials:
      | { id: string; transports?: AuthenticatorTransportFuture[] }[]
      | undefined;
    let challengeKey: string;
    let sessionId: string | undefined;
    let scopedEmail: string | undefined;

    if (email) {
      const user = await User.findOne({ email });
      // Don't reveal whether the email exists or has passkeys — return options
      // either way. If there are no credentials, the browser will simply fail
      // gracefully (NotAllowedError) which is indistinguishable from "user
      // declined".
      allowCredentials = (user?.credentials || []).map((c) => ({
        id: c.credentialID,
        transports: (c.transports || []) as AuthenticatorTransportFuture[],
      }));
      challengeKey = authEmailKey(email);
      scopedEmail = email;
    } else {
      // Discoverable-credential flow.
      sessionId = crypto.randomBytes(16).toString("base64url");
      challengeKey = authDiscKey(sessionId);
      allowCredentials = []; // empty = let any resident credential respond
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      timeout: AUTHENTICATION_TIMEOUT_MS,
      userVerification: "preferred",
      allowCredentials,
    });

    await storeChallenge({
      key: challengeKey,
      challenge: options.challenge,
      type: "authentication",
      email: scopedEmail,
    });

    // Attach our internal session id so the verify step can find the challenge.
    return res.json({ ...options, sessionId });
  } catch (err) {
    console.error("[webauthn] authenticationOptions failed:", err);
    return res.status(500).json({ error: "Failed to start authentication" });
  }
};

/**
 * Verify the authentication response and issue a JWT identical to the existing
 * email/password login flow.
 */
export const authenticationVerify = async (req: Request, res: Response) => {
  try {
    const response = req.body?.response as
      | AuthenticationResponseJSON
      | undefined;
    const email: string =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const sessionId: string =
      typeof req.body?.sessionId === "string" ? req.body.sessionId : "";

    if (!response) {
      return res.status(400).json({ error: "Missing response" });
    }

    const challengeKey = email
      ? authEmailKey(email)
      : sessionId
        ? authDiscKey(sessionId)
        : null;
    if (!challengeKey) {
      return res
        .status(400)
        .json({ error: "Missing email or sessionId for verification" });
    }

    const challengeDoc = await consumeChallenge(challengeKey);
    if (!challengeDoc) {
      return res
        .status(400)
        .json({ error: "Challenge expired — please retry" });
    }

    // Find the user that owns this credential. `response.id` is the
    // credentialID the authenticator selected (base64url).
    const credentialID = response.id;
    const user = await User.findOne({
      "credentials.credentialID": credentialID,
    });
    if (!user) {
      return res.status(404).json({ error: "Unknown credential" });
    }

    // If the request was scoped by email, ensure the responding credential
    // actually belongs to that user.
    if (email && user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(401).json({ error: "Credential mismatch" });
    }

    const credential = user.credentials.find(
      (c) => c.credentialID === credentialID,
    );
    if (!credential) {
      return res.status(404).json({ error: "Unknown credential" });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: ORIGIN_LIST,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: credential.credentialID,
        publicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: (credential.transports ||
          []) as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "Verification failed" });
    }

    const { newCounter } = verification.authenticationInfo;
    // Detect potential cloned authenticator: counter must be strictly greater
    // unless the device legitimately reports 0 (some platform authenticators do).
    if (newCounter !== 0 && newCounter <= credential.counter) {
      console.warn(
        `[webauthn] counter regression for credential ${credential.credentialID} ` +
          `(stored=${credential.counter}, received=${newCounter})`,
      );
    }
    credential.counter = newCounter;
    credential.lastUsedAt = new Date();
    await user.save();

    const token = issueAuthToken({ _id: user._id, email: user.email });
    setAuthCookie(res, token);

    return res.json({
      token,
      user: { username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("[webauthn] authenticationVerify failed:", err);
    return res.status(500).json({ error: "Failed to verify passkey" });
  }
};

// ─── Credential management ──────────────────────────────────────────────────

export const listCredentials = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user.id).select("credentials");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      credentials: user.credentials.map(serializeCredential),
    });
  } catch (err) {
    console.error("[webauthn] listCredentials failed:", err);
    return res.status(500).json({ error: "Failed to list passkeys" });
  }
};

export const renameCredential = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const nickname: string =
      typeof req.body?.nickname === "string"
        ? req.body.nickname.trim().slice(0, 60)
        : "";
    if (!nickname) {
      return res.status(400).json({ error: "Nickname is required" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const cred = user.credentials.id(id);
    if (!cred) return res.status(404).json({ error: "Passkey not found" });
    cred.nickname = nickname;
    await user.save();
    return res.json({ credential: serializeCredential(cred) });
  } catch (err) {
    console.error("[webauthn] renameCredential failed:", err);
    return res.status(500).json({ error: "Failed to rename passkey" });
  }
};

export const deleteCredential = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const cred = user.credentials.id(id);
    if (!cred) return res.status(404).json({ error: "Passkey not found" });
    cred.deleteOne();
    await user.save();
    return res.json({ message: "Passkey removed" });
  } catch (err) {
    console.error("[webauthn] deleteCredential failed:", err);
    return res.status(500).json({ error: "Failed to delete passkey" });
  }
};

// ─── Internal utilities ─────────────────────────────────────────────────────

function defaultNicknameForTransports(transports?: string[]) {
  if (!transports || transports.length === 0) return "Passkey";
  if (transports.includes("internal")) return "This device";
  if (transports.includes("hybrid")) return "Phone or tablet";
  if (transports.includes("usb")) return "Security key";
  return "Passkey";
}

function serializeCredential(cred: any) {
  return {
    id: String(cred._id),
    credentialID: cred.credentialID,
    nickname: cred.nickname || "Passkey",
    transports: cred.transports || [],
    deviceType: cred.deviceType,
    backedUp: cred.backedUp,
    createdAt: cred.createdAt,
    lastUsedAt: cred.lastUsedAt,
  };
}
