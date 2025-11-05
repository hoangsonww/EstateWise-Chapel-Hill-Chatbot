import { Request, Response } from "express";
import ForumPost from "../models/ForumPost.model";
import ForumComment from "../models/ForumComment.model";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";

// Posts
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const author = new mongoose.Types.ObjectId(req.user!.id);
    const post = new ForumPost({ title, content, author });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await ForumPost.find()
      .populate("author", "username")
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await ForumPost.findById(req.params.postId)
      .populate("author", "username")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username",
        },
      });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const post = await ForumPost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user!.id) {
      return res.status(403).json({ message: "User not authorized" });
    }

    post.title = title;
    post.content = content;
    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error updating post", error });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await ForumPost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user!.id) {
      return res.status(403).json({ message: "User not authorized" });
    }

    await ForumComment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error });
  }
};

// Comments
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const author = new mongoose.Types.ObjectId(req.user!.id);
    const post = req.params.postId;
    const comment = new ForumComment({ content, author, post });
    await comment.save();

    await ForumPost.findByIdAndUpdate(post, {
      $push: { comments: comment._id },
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment", error });
  }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const comment = await ForumComment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user!.id) {
      return res.status(403).json({ message: "User not authorized" });
    }

    comment.content = content;
    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error updating comment", error });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await ForumComment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user!.id) {
      return res.status(403).json({ message: "User not authorized" });
    }

    await ForumPost.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id },
    });

    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment", error });
  }
};
