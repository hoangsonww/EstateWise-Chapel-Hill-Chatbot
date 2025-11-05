import mongoose, { Document, Schema } from "mongoose";

export interface IForumPost extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  comments: mongoose.Types.ObjectId[];
}

const ForumPostSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [{ type: Schema.Types.ObjectId, ref: "ForumComment" }],
  },
  { timestamps: true },
);

export default mongoose.model<IForumPost>("ForumPost", ForumPostSchema);
