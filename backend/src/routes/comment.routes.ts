import { Router } from "express";
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  upvoteComment,
  downvoteComment,
} from "../controllers/comment.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Failed to create comment.
 */
router.post("/", authMiddleware, createComment);

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Get all comments for a specific post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of comments.
 *       500:
 *         description: Failed to fetch comments.
 */
router.get("/post/:postId", getCommentsByPost);

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Failed to update comment.
 */
router.put("/:id", authMiddleware, updateComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Failed to delete comment.
 */
router.delete("/:id", authMiddleware, deleteComment);

/**
 * @swagger
 * /api/comments/{id}/upvote:
 *   post:
 *     summary: Upvote a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment upvoted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Failed to upvote comment.
 */
router.post("/:id/upvote", authMiddleware, upvoteComment);

/**
 * @swagger
 * /api/comments/{id}/downvote:
 *   post:
 *     summary: Downvote a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment downvoted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Failed to downvote comment.
 */
router.post("/:id/downvote", authMiddleware, downvoteComment);

export default router;
