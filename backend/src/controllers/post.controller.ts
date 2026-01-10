import { Request, Response } from "express";
import mongoose from "mongoose";
import Post from "../models/Post.model";
import Comment from "../models/Comment.model";
import { AuthRequest } from "../middleware/auth.middleware";

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "commentCount",
  "viewCount",
  "upvotes",
]);

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const resolveSort = (sortBy?: string, sortOrder?: string) => {
  const resolvedSortBy =
    sortBy && SORTABLE_FIELDS.has(sortBy) ? sortBy : "createdAt";
  const resolvedSortOrder = sortOrder === "asc" ? 1 : -1;
  return { sortBy: resolvedSortBy, sortOrder: resolvedSortOrder };
};

const buildSort = (sortBy: string, sortOrder: 1 | -1) => {
  const field = sortBy === "upvotes" ? "upvoteCount" : sortBy;
  const sort: Record<string, 1 | -1> = { [field]: sortOrder };
  if (sortBy !== "createdAt") {
    sort.createdAt = -1;
  }
  return sort;
};

/**
 * Creates a new forum post.
 *
 * @param req - The request object containing the user's ID and post details.
 * @param res - The response object to send the created post back to the client.
 */
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const newPost = new Post({
      author: req.user.id,
      title,
      content,
      category: category || "General",
      upvotes: [],
      downvotes: [],
      commentCount: 0,
      viewCount: 0,
    });

    await newPost.save();
    await newPost.populate("author", "username email");
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

/**
 * Fetches all posts with pagination and optional category filter.
 *
 * @param req - The request object containing pagination and filter parameters.
 * @param res - The response object to send the posts back to the client.
 */
export const getPosts = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const pageNumber = parsePositiveInt(req.query.page, 1);
    const limitNumber = parsePositiveInt(req.query.limit, 20);
    const { sortBy, sortOrder } = resolveSort(
      typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
      typeof req.query.sortOrder === "string" ? req.query.sortOrder : undefined,
    );
    const filter: any = {};
    if (category && category !== "All") {
      filter.category = category;
    }

    const total = await Post.countDocuments(filter);
    const skip = (pageNumber - 1) * limitNumber;
    const sort = buildSort(sortBy, sortOrder);

    if (sortBy === "upvotes") {
      const posts = await Post.aggregate([
        { $match: filter },
        { $addFields: { upvoteCount: { $size: "$upvotes" } } },
        { $sort: sort },
        { $skip: skip },
        { $limit: limitNumber },
        { $project: { upvoteCount: 0 } },
      ]);
      const populatedPosts = await Post.populate(posts, {
        path: "author",
        select: "username email",
      });

      return res.json({
        posts: populatedPosts,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
      });
    }

    const posts = await Post.find(filter)
      .populate("author", "username email")
      .sort(sort)
      .limit(limitNumber)
      .skip(skip);

    res.json({
      posts,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

/**
 * Fetches a single post by ID and increments view count.
 *
 * @param req - The request object containing the post ID.
 * @param res - The response object to send the post back to the client.
 */
export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true },
    ).populate("author", "username email");

    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

/**
 * Updates a post (only by the author).
 *
 * @param req - The request object containing the post ID and updated data.
 * @param res - The response object to send the updated post back to the client.
 */
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { title, content, category } = req.body;

    const post = await Post.findOne({ _id: id, author: req.user.id });
    if (!post) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;

    await post.save();
    await post.populate("author", "username email");
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

/**
 * Deletes a post (only by the author).
 *
 * @param req - The request object containing the post ID.
 * @param res - The response object to send the deletion confirmation.
 */
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const post = await Post.findOneAndDelete({ _id: id, author: req.user.id });
    if (!post) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    // Delete all comments associated with this post
    await Comment.deleteMany({ post: id });

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

/**
 * Upvotes a post.
 *
 * @param req - The request object containing the post ID.
 * @param res - The response object to send the updated post back.
 */
export const upvotePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.id;
    const upvoteIndex = post.upvotes.findIndex(
      (uid) => uid.toString() === userId,
    );
    const downvoteIndex = post.downvotes.findIndex(
      (uid) => uid.toString() === userId,
    );

    // Remove from downvotes if present
    if (downvoteIndex !== -1) {
      post.downvotes.splice(downvoteIndex, 1);
    }

    // Toggle upvote
    if (upvoteIndex !== -1) {
      post.upvotes.splice(upvoteIndex, 1);
    } else {
      post.upvotes.push(new mongoose.Types.ObjectId(userId));
    }

    await post.save();
    await post.populate("author", "username email");
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to upvote post" });
  }
};

/**
 * Downvotes a post.
 *
 * @param req - The request object containing the post ID.
 * @param res - The response object to send the updated post back.
 */
export const downvotePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.id;
    const upvoteIndex = post.upvotes.findIndex(
      (uid) => uid.toString() === userId,
    );
    const downvoteIndex = post.downvotes.findIndex(
      (uid) => uid.toString() === userId,
    );

    // Remove from upvotes if present
    if (upvoteIndex !== -1) {
      post.upvotes.splice(upvoteIndex, 1);
    }

    // Toggle downvote
    if (downvoteIndex !== -1) {
      post.downvotes.splice(downvoteIndex, 1);
    } else {
      post.downvotes.push(new mongoose.Types.ObjectId(userId));
    }

    await post.save();
    await post.populate("author", "username email");
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to downvote post" });
  }
};

/**
 * Searches posts by title or content.
 *
 * @param req - The request object containing the search query.
 * @param res - The response object to send the search results back.
 */
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { q, category } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }
    const { sortBy, sortOrder } = resolveSort(
      typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
      typeof req.query.sortOrder === "string" ? req.query.sortOrder : undefined,
    );

    const regex = new RegExp(q as string, "i");
    const filter: any = {
      $or: [{ title: regex }, { content: regex }],
    };

    if (category && category !== "All") {
      filter.category = category;
    }

    const sort = buildSort(sortBy, sortOrder);

    if (sortBy === "upvotes") {
      const posts = await Post.aggregate([
        { $match: filter },
        { $addFields: { upvoteCount: { $size: "$upvotes" } } },
        { $sort: sort },
        { $limit: 50 },
        { $project: { upvoteCount: 0 } },
      ]);
      const populatedPosts = await Post.populate(posts, {
        path: "author",
        select: "username email",
      });
      return res.json(populatedPosts);
    }

    const posts = await Post.find(filter)
      .populate("author", "username email")
      .sort(sort)
      .limit(50);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};
