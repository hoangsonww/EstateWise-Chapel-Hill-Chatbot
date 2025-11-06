import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       description: Represents a comment on a forum post.
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the comment.
 *         post:
 *           type: string
 *           description: The ID of the post this comment belongs to.
 *         author:
 *           type: string
 *           description: The ID of the user who created this comment.
 *         content:
 *           type: string
 *           description: The content of the comment.
 *         upvotes:
 *           type: array
 *           description: Array of user IDs who upvoted this comment.
 *           items:
 *             type: string
 *         downvotes:
 *           type: array
 *           description: Array of user IDs who downvoted this comment.
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was last updated.
 *       required:
 *         - post
 *         - author
 *         - content
 */

/**
 * Represents a comment on a forum post.
 */
export interface IComment extends Document {
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comment schema.
 */
const CommentSchema: Schema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// Index for faster queries
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ author: 1 });

export default mongoose.model<IComment>("Comment", CommentSchema);
