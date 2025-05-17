"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversation_controller_1 = require("../controllers/conversation.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Conversation details. The title is optional; if not provided, it defaults to "Untitled Conversation".
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: My Conversation Title
 *     responses:
 *       201:
 *         description: Conversation created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 user:
 *                   type: string
 *                 title:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       500:
 *         description: Server error - Failed to create conversation.
 */
router.post("/", auth_middleware_1.authMiddleware, conversation_controller_1.createConversation);
/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Retrieve all conversations for the authenticated user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of conversations for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   title:
 *                     type: string
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       500:
 *         description: Server error - Failed to fetch conversations.
 */
router.get("/", auth_middleware_1.authMiddleware, conversation_controller_1.getConversations);
/**
 * @swagger
 * /api/conversations/search:
 *   get:
 *     summary: Search conversations by title
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query to filter conversations by title.
 *     responses:
 *       200:
 *         description: A list of conversations matching the search criteria.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   title:
 *                     type: string
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       500:
 *         description: Search failed due to a server error.
 */
router.get("/search", auth_middleware_1.authMiddleware, conversation_controller_1.searchConversations);
/**
 * @swagger
 * /api/conversations/{id}:
 *   put:
 *     summary: Update the title of a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the conversation to update.
 *     requestBody:
 *       required: true
 *       description: New title for the conversation.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Conversation Title
 *     responses:
 *       200:
 *         description: Conversation updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 user:
 *                   type: string
 *                 title:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Server error - Failed to update conversation.
 */
router.put("/:id", auth_middleware_1.authMiddleware, conversation_controller_1.updateConversation);
/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique ID of the conversation to delete.
 *     responses:
 *       200:
 *         description: Conversation deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Conversation deleted successfully
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Server error - Failed to delete conversation.
 */
router.delete("/:id", auth_middleware_1.authMiddleware, conversation_controller_1.deleteConversation);
exports.default = router;
