import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       description: Represents a forum post.
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the post.
 *         author:
 *           type: string
 *           description: The ID of the user who created this post.
 *         title:
 *           type: string
 *           description: The title of the post.
 *         content:
 *           type: string
 *           description: The content/body of the post.
 *         category:
 *           type: string
 *           description: Category of the post.
 *           default: General
 *         upvotes:
 *           type: array
 *           description: Array of user IDs who upvoted this post.
 *           items:
 *             type: string
 *         downvotes:
 *           type: array
 *           description: Array of user IDs who downvoted this post.
 *           items:
 *             type: string
 *         commentCount:
 *           type: number
 *           description: Number of comments on this post.
 *           default: 0
 *         viewCount:
 *           type: number
 *           description: Number of views this post has received.
 *           default: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the post was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the post was last updated.
 *       required:
 *         - author
 *         - title
 *         - content
 */

/**
 * Represents a forum post.
 */
export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: string;
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Post schema.
 */
const PostSchema: Schema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, default: "General", trim: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Index for faster queries
PostSchema.index({ createdAt: -1 });
PostSchema.index({ category: 1 });
PostSchema.index({ author: 1 });

export default mongoose.model<IPost>("Post", PostSchema);
