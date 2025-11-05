import { Router } from "express";
import * as forumController from "../controllers/forum.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Forum
 *   description: API for managing the community forum
 */

/**
 * @swagger
 * /api/forum/posts:
 *   post:
 *     summary: Create a new forum post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Best neighborhoods for families?"
 *               content:
 *                 type: string
 *                 example: "Hi everyone, I'm moving to Chapel Hill with my family and..."
 *     responses:
 *       201:
 *         description: Post created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/posts", authMiddleware, forumController.createPost);

/**
 * @swagger
 * /api/forum/posts:
 *   get:
 *     summary: Get all forum posts
 *     tags: [Forum]
 *     responses:
 *       200:
 *         description: A list of forum posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ForumPost'
 *       500:
 *         description: Server error
 */
router.get("/posts", forumController.getPosts);

/**
 * @swagger
 * /api/forum/posts/{postId}:
 *   get:
 *     summary: Get a specific forum post by ID
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The forum post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForumPostWithComments'
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/posts/:postId", forumController.getPostById);

/**
 * @swagger
 * /api/forum/posts/{postId}:
 *   put:
 *     summary: Update a forum post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.put("/posts/:postId", authMiddleware, forumController.updatePost);

/**
 * @swagger
 * /api/forum/posts/{postId}:
 *   delete:
 *     summary: Delete a forum post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.delete("/posts/:postId", authMiddleware, forumController.deletePost);

/**
 * @swagger
 * /api/forum/posts/{postId}/comments:
 *   post:
 *     summary: Create a new comment on a forum post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "We love the Meadowmont area!"
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  forumController.createComment,
);

/**
 * @swagger
 * /api/forum/comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.put(
  "/comments/:commentId",
  authMiddleware,
  forumController.updateComment,
);

/**
 * @swagger
 * /api/forum/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/comments/:commentId",
  authMiddleware,
  forumController.deleteComment,
);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     ForumPost:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ForumComment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         content:
 *           type: string
 *         author:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *         post:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ForumPostWithComments:
 *       allOf:
 *         - $ref: '#/components/schemas/ForumPost'
 *         - type: object
 *           properties:
 *             comments:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ForumComment'
 */
