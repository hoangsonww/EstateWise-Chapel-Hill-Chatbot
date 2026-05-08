import mongoose, { Document, Schema } from "mongoose";

/**
 * Short-lived WebAuthn challenge record.
 *
 * Created when the server issues registration/authentication options,
 * and consumed exactly once during verification. Documents auto-expire
 * via a TTL index so abandoned ceremonies are cleaned up automatically.
 *
 * `key` is a stable lookup token:
 *   - registration: `reg:<userId>`
 *   - authentication w/ email: `auth:email:<email-lowercase>`
 *   - discoverable (usernameless) authentication: `auth:disc:<sessionId>`
 */
export interface IWebAuthnChallenge extends Document {
  key: string;
  challenge: string;
  type: "registration" | "authentication";
  userId?: string;
  email?: string;
  createdAt: Date;
  expiresAt: Date;
}

const WebAuthnChallengeSchema = new Schema<IWebAuthnChallenge>({
  key: { type: String, required: true, unique: true, index: true },
  challenge: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["registration", "authentication"],
  },
  userId: { type: String, default: null },
  email: { type: String, default: null },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
});

// TTL: Mongo removes the document automatically once expiresAt passes.
WebAuthnChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IWebAuthnChallenge>(
  "WebAuthnChallenge",
  WebAuthnChallengeSchema,
);
