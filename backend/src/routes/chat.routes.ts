import { Router } from "express";
import {
  chat,
  rateConversation,
  generateGuestTitle,
} from "../controllers/chat.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/chat/rate:
 *   post:
 *     summary: Rate a conversation
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Rate a conversation with thumbs up or down.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - convoId
 *               - rating
 *             properties:
 *               convoId:
 *                 type: string
 *                 description: ID of the conversation to rate.
 *               rating:
 *                 type: string
 *                 description: "'up' for thumbs up, 'down' for thumbs down."
 *                 enum:
 *                   - up
 *                   - down
 *     responses:
 *       200:
 *         description: Rating recorded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 expertWeights:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *       401:
 *         description: Unauthorized - invalid or missing authentication token.
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Server error - Unable to process rating request.
 */
router.post("/rate", rateConversation);

/**
 * @swagger
 * /api/chat/generate-title:
 *   post:
 *     summary: Generate a conversation title (guest-friendly)
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       description: Seed message or history to generate a short title.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: A user message to seed the title.
 *                 example: "Looking for a 3-bedroom near UNC"
 *               history:
 *                 type: array
 *                 description: Optional history entries (role + text/parts).
 *     responses:
 *       200:
 *         description: Title generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestedName:
 *                   type: string
 *       400:
 *         description: Missing seed message.
 *       500:
 *         description: Server error - Unable to generate title.
 */
router.post("/generate-title", generateGuestTitle);

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a chat message to EstateWise
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Contains the conversation history and the new message.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - history
 *               - message
 *             properties:
 *               history:
 *                 type: array
 *                 description: An array containing previous chat messages.
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - parts
 *                   properties:
 *                     role:
 *                       type: string
 *                       description: Role of the message sender (e.g., user, assistant).
 *                       example: user
 *                     parts:
 *                       type: array
 *                       description: Contains the content segments of the message.
 *                       items:
 *                         type: object
 *                         required:
 *                           - text
 *                         properties:
 *                           text:
 *                             type: string
 *                             description: The text content of the message part.
 *                             example: Hello, how can I help you?
 *               message:
 *                 type: string
 *                 description: The new message content to be sent.
 *                 example: I need information on property taxes.
 *     responses:
 *       200:
 *         description: Chat response returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   description: The reply message from EstateWise.
 *                   example: Sure, I can help you with property taxes. Could you provide more details?
 *                 expertViews:
 *                   type: object
 *                   description: Raw outputs from each expert model (for optional expert‑only view UI).
 *                   additionalProperties:
 *                     type: string
 *                 convoId:
 *                   type: string
 *                   description: The conversation ID for authenticated users.
 *       401:
 *         description: Unauthorized - invalid or missing authentication token.
 *       500:
 *         description: Server error - Unable to process chat request.
 */
router.post("/", authMiddleware, chat);

export default router;
