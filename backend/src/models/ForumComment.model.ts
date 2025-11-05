import mongoose, { Document, Schema } from "mongoose";

export interface IForumComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
}

const ForumCommentSchema: Schema = new Schema(
  {
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IForumComment>(
  "ForumComment",
  ForumCommentSchema,
);
