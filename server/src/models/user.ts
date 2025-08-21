import mongoose, { Schema, Document, ObjectId } from "mongoose"

export interface IUser extends Document {
  _id: ObjectId
  fullName: string
  username: string
  password: string
  secretKey: string
}

const UserSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    secretKey: { type: String, required: true, unique: true }
  },
  {
    collection: process.env.MONGO_COLLECTION || "tweakerdbcollection"
  }
)

export default mongoose.model<IUser>(
  "User",
  UserSchema,
  process.env.MONGO_COLLECTION || "tweakerdbcollection"
)
