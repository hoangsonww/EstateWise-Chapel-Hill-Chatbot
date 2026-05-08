import { Router } from "express";
import {
  signUp,
  login,
  logout,
  verifyEmail,
  resetPasswordForEmail,
  getProfile,
  updateProfile,
  updatePassword,
} from "../controllers/auth.controller";
import {
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  listCredentials,
  renameCredential,
  deleteCredential,
} from "../controllers/webauthn.controller";
import { authMiddleware, requireAuth } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Sign up for a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: User registration details
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: yourSecurePassword123
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: User already exists
 *       500:
 *         description: Server error - Failed to create user
 */
router.post("/signup", signUp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to your account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: User credentials for login
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: yourSecurePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error - Failed to login
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out of your account
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful; user token is cleared
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify the user's email address
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: Email address to be verified
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email verified
 *                 email:
 *                   type: string
 *                   format: email
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error - Failed to verify email
 */
router.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset the user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: Email and new password for the user
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: newSecurePassword456
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error - Failed to reset password
 */
router.post("/reset-password", resetPasswordForEmail);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error - Failed to fetch profile
 */
router.get("/me", authMiddleware, getProfile);

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update the authenticated user's profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: Profile fields to update
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error - Failed to update profile
 */
router.put("/me", authMiddleware, updateProfile);

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     summary: Update the authenticated user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: Current and new password
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error - Failed to update password
 */
router.put("/password", authMiddleware, updatePassword);

// ─── WebAuthn (passkeys) ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/webauthn/register/options:
 *   post:
 *     summary: Begin passkey registration (authenticated)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: PublicKeyCredentialCreationOptionsJSON
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/webauthn/register/options",
  authMiddleware,
  requireAuth,
  registrationOptions,
);

/**
 * @swagger
 * /api/auth/webauthn/register/verify:
 *   post:
 *     summary: Complete passkey registration (authenticated)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response:
 *                 type: object
 *                 description: RegistrationResponseJSON from @simplewebauthn/browser
 *               nickname:
 *                 type: string
 *     responses:
 *       201:
 *         description: Passkey registered
 *       400:
 *         description: Verification failed or challenge expired
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Passkey already registered to another account
 */
router.post(
  "/webauthn/register/verify",
  authMiddleware,
  requireAuth,
  registrationVerify,
);

/**
 * @swagger
 * /api/auth/webauthn/login/options:
 *   post:
 *     summary: Begin passkey authentication
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional — scopes options to a specific user.
 *     responses:
 *       200:
 *         description: PublicKeyCredentialRequestOptionsJSON (+ sessionId for discoverable flow)
 */
router.post("/webauthn/login/options", authenticationOptions);

/**
 * @swagger
 * /api/auth/webauthn/login/verify:
 *   post:
 *     summary: Complete passkey authentication and issue a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response:
 *                 type: object
 *                 description: AuthenticationResponseJSON from @simplewebauthn/browser
 *               email:
 *                 type: string
 *                 description: Required if options were requested with email.
 *               sessionId:
 *                 type: string
 *                 description: Required for discoverable-credential flow.
 *     responses:
 *       200:
 *         description: Login successful — token + user
 *       400:
 *         description: Challenge expired or response invalid
 *       401:
 *         description: Verification failed
 *       404:
 *         description: Unknown credential
 */
router.post("/webauthn/login/verify", authenticationVerify);

/**
 * @swagger
 * /api/auth/webauthn/credentials:
 *   get:
 *     summary: List the authenticated user's registered passkeys
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Array of credential metadata (no secrets)
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/webauthn/credentials",
  authMiddleware,
  requireAuth,
  listCredentials,
);

/**
 * @swagger
 * /api/auth/webauthn/credentials/{id}:
 *   patch:
 *     summary: Rename a passkey
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nickname]
 *             properties:
 *               nickname: { type: string }
 *     responses:
 *       200:
 *         description: Updated credential
 *   delete:
 *     summary: Remove a passkey
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Passkey removed
 */
router.patch(
  "/webauthn/credentials/:id",
  authMiddleware,
  requireAuth,
  renameCredential,
);
router.delete(
  "/webauthn/credentials/:id",
  authMiddleware,
  requireAuth,
  deleteCredential,
);

export default router;
