import { Router } from "express";
import * as forumController from "../controllers/forum.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Post routes
router.post("/posts", authMiddleware, forumController.createPost);
router.get("/posts", forumController.getPosts);
router.get("/posts/:postId", forumController.getPostById);
router.put("/posts/:postId", authMiddleware, forumController.updatePost);
router.delete("/posts/:postId", authMiddleware, forumController.deletePost);

// Comment routes
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  forumController.createComment,
);
router.put(
  "/comments/:commentId",
  authMiddleware,
  forumController.updateComment,
);
router.delete(
  "/comments/:commentId",
  authMiddleware,
  forumController.deleteComment,
);

export default router;
