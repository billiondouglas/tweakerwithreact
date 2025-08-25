import mongoose, { Schema, Document, ObjectId } from "mongoose"

export interface IUser extends Document {
  _id: ObjectId
  fullName: string
  username: string
  password: string
  secretKey: string
  bio?: string
  link?: string
  coverImage?: string | null
  avatar?: string | null
  followers?: ObjectId[]
  following?: ObjectId[]
}

const UserSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    secretKey: { type: String, required: true, unique: true },
    bio: { type: String, default: '' },
    link: { type: String, default: '' },
    coverImage: { type: String, default: null },
    avatar: { type: String, default: null },
    followers: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    following: [{ type: Schema.Types.ObjectId, ref: "User", index: true }]
  },
  {
    collection: process.env.MONGO_COLLECTION || "tweakerdbcollection",
    timestamps: true
  }
)

export default mongoose.model<IUser>(
  "User",
  UserSchema,
  process.env.MONGO_COLLECTION || "tweakerdbcollection"
)
