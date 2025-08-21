import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IComment {
  _id?: Types.ObjectId
  username: string
  text: string
  createdAt: Date
}

export interface IRetweet {
  username: string
  createdAt: Date
}

export interface ITweet extends Document {
  text: string
  username: string
  likes: Types.ObjectId[]
  comments: IComment[]
  retweets: IRetweet[]
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
    createdAt: { type: Date, default: Date.now }
  }
)

const RetweetSchema = new Schema<IRetweet>(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const TweetSchema = new Schema<ITweet>(
  {
    text: { type: String, required: true, trim: true, maxlength: 280 },
    username: { type: String, required: true, trim: true, lowercase: true, index: true },
    // store user ObjectIds for likes; align with login flow using user._id
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    comments: { type: [CommentSchema], default: [] },
    retweets: { type: [RetweetSchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: process.env.MONGO_TWEETS_COLLECTION || 'tweets',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Optimize fetching comments for a tweet in reverse chronological order
TweetSchema.index({ _id: 1, 'comments.createdAt': -1 })

TweetSchema.virtual('replyCount').get(function(this: ITweet) { return this.comments?.length || 0 })
TweetSchema.virtual('likeCount').get(function(this: ITweet) { return this.likes?.length || 0 })
TweetSchema.virtual('retweetCount').get(function(this: ITweet) { return this.retweets?.length || 0 })

export default mongoose.models.Tweet || mongoose.model<ITweet>(
  'Tweet',
  TweetSchema,
  process.env.MONGO_TWEETS_COLLECTION || 'tweets'
)