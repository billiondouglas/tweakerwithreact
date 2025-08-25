import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  likedBy: mongoose.Types.ObjectId[];
  likes: number; // virtual
}

export interface IPostMethods {
  like(userId: mongoose.Types.ObjectId): Promise<void>;
  unlike(userId: mongoose.Types.ObjectId): Promise<void>;
}

export type PostModel = Model<IPost, {}, IPostMethods>;

const PostSchema = new Schema<IPost, PostModel, IPostMethods>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 280 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual count for likes
PostSchema.virtual("likes").get(function (this: IPost) {
  return Array.isArray(this.likedBy) ? this.likedBy.length : 0;
});

// Instance helpers
PostSchema.methods.like = async function (userId: mongoose.Types.ObjectId) {
  await this.updateOne({ $addToSet: { likedBy: userId } });
};

PostSchema.methods.unlike = async function (userId: mongoose.Types.ObjectId) {
  await this.updateOne({ $pull: { likedBy: userId } });
};

// Helpful index for feeds
PostSchema.index({ createdAt: -1 });

const Post: PostModel =
  (mongoose.models.Post as PostModel) ||
  mongoose.model<IPost, PostModel>("Post", PostSchema);

export default Post;