import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     PasskeyCredential:
 *       type: object
 *       description: A single WebAuthn (passkey) credential registered to a user.
 *       properties:
 *         _id:
 *           type: string
 *         credentialID:
 *           type: string
 *           description: Base64url-encoded credential identifier.
 *         counter:
 *           type: number
 *         transports:
 *           type: array
 *           items:
 *             type: string
 *         deviceType:
 *           type: string
 *           enum: [singleDevice, multiDevice]
 *         backedUp:
 *           type: boolean
 *         nickname:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastUsedAt:
 *           type: string
 *           format: date-time
 *     User:
 *       type: object
 *       description: Represents a user in the system.
 *       properties:
 *         _id:
 *           type: string
 *           example: 60d0fe4f5311236168a109ca
 *         username:
 *           type: string
 *           example: johndoe
 *         email:
 *           type: string
 *           format: email
 *           example: johndoe@example.com
 *         password:
 *           type: string
 *           description: Hashed password. Optional — accounts may use passkey-only auth.
 *         credentials:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PasskeyCredential'
 *       required:
 *         - username
 *         - email
 */

export interface IPasskeyCredential {
  _id?: Types.ObjectId;
  credentialID: string; // base64url
  publicKey: Buffer; // raw COSE public key bytes
  counter: number;
  transports?: string[];
  deviceType?: "singleDevice" | "multiDevice";
  backedUp?: boolean;
  nickname?: string;
  createdAt?: Date;
  lastUsedAt?: Date;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  credentials: Types.DocumentArray<IPasskeyCredential & Types.Subdocument>;
}

const PasskeyCredentialSchema = new Schema<IPasskeyCredential>(
  {
    credentialID: { type: String, required: true, index: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: {
      type: String,
      enum: ["singleDevice", "multiDevice"],
      default: "singleDevice",
    },
    backedUp: { type: Boolean, default: false },
    nickname: { type: String, default: "" },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  // Password becomes optional so future passkey-only signups don't require one.
  // Existing email/password flows still pass it through hashed.
  password: { type: String, required: false },
  credentials: { type: [PasskeyCredentialSchema], default: [] },
});

// Ensure credentialID lookups across all users are fast.
UserSchema.index({ "credentials.credentialID": 1 });

export default mongoose.model<IUser>("User", UserSchema);
