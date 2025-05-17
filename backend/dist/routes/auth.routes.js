"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
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
router.post("/signup", auth_controller_1.signUp);
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
router.post("/login", auth_controller_1.login);
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
router.post("/logout", auth_controller_1.logout);
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
router.post("/verify-email", auth_controller_1.verifyEmail);
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
router.post("/reset-password", auth_controller_1.resetPasswordForEmail);
exports.default = router;
