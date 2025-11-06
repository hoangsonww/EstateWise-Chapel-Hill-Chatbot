import { Request, Response } from "express";
import mongoose from "mongoose";
import Comment from "../models/Comment.model";
import Post from "../models/Post.model";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Creates a new comment on a post.
 *
 * @param req - The request object containing the comment details.
 * @param res - The response object to send the created comment back.
 */
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { postId, content } = req.body;

    if (!postId || !content) {
      return res
        .status(400)
        .json({ error: "Post ID and content are required" });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const newComment = new Comment({
      post: postId,
      author: req.user.id,
      content,
      upvotes: [],
      downvotes: [],
    });

    await newComment.save();
    await newComment.populate("author", "username email");

    // Increment comment count on post
    post.commentCount += 1;
    await post.save();

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create comment" });
  }
};

/**
 * Fetches all comments for a specific post.
 *
 * @param req - The request object containing the post ID.
 * @param res - The response object to send the comments back.
 */
export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

/**
 * Updates a comment (only by the author).
 *
 * @param req - The request object containing the comment ID and updated content.
 * @param res - The response object to send the updated comment back.
 */
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const comment = await Comment.findOne({ _id: id, author: req.user.id });
    if (!comment) {
      return res
        .status(404)
        .json({ error: "Comment not found or unauthorized" });
    }

    comment.content = content;
    await comment.save();
    await comment.populate("author", "username email");

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to update comment" });
  }
};

/**
 * Deletes a comment (only by the author).
 *
 * @param req - The request object containing the comment ID.
 * @param res - The response object to send the deletion confirmation.
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    // First find the comment to get the post ID
    const comment = await Comment.findOne({
      _id: id,
      author: req.user.id,
    });
    if (!comment) {
      return res
        .status(404)
        .json({ error: "Comment not found or unauthorized" });
    }

    const postId = comment.post;

    // Delete the comment
    await Comment.deleteOne({ _id: id });

    // Decrement comment count on post
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentCount: -1 },
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

/**
 * Upvotes a comment.
 *
 * @param req - The request object containing the comment ID.
 * @param res - The response object to send the updated comment back.
 */
export const upvoteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userId = req.user.id;
    const upvoteIndex = comment.upvotes.findIndex(
      (uid) => uid.toString() === userId,
    );
    const downvoteIndex = comment.downvotes.findIndex(
      (uid) => uid.toString() === userId,
    );

    // Remove from downvotes if present
    if (downvoteIndex !== -1) {
      comment.downvotes.splice(downvoteIndex, 1);
    }

    // Toggle upvote
    if (upvoteIndex !== -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(new mongoose.Types.ObjectId(userId));
    }

    await comment.save();
    await comment.populate("author", "username email");
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to upvote comment" });
  }
};

/**
 * Downvotes a comment.
 *
 * @param req - The request object containing the comment ID.
 * @param res - The response object to send the updated comment back.
 */
export const downvoteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userId = req.user.id;
    const upvoteIndex = comment.upvotes.findIndex(
      (uid) => uid.toString() === userId,
    );
    const downvoteIndex = comment.downvotes.findIndex(
      (uid) => uid.toString() === userId,
    );

    // Remove from upvotes if present
    if (upvoteIndex !== -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    }

    // Toggle downvote
    if (downvoteIndex !== -1) {
      comment.downvotes.splice(downvoteIndex, 1);
    } else {
      comment.downvotes.push(new mongoose.Types.ObjectId(userId));
    }

    await comment.save();
    await comment.populate("author", "username email");
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to downvote comment" });
  }
};
