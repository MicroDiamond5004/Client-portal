import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;
  targetId: string;
  authorId: string;
  body: string;
  comments: IComment[];
  unreadCommentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  authorId: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MessageSchema = new Schema<IMessage>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    type: String,
    required: true
  },
  authorId: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  comments: [CommentSchema],
  unreadCommentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
MessageSchema.index({ userId: 1, targetId: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 });
MessageSchema.index({ authorId: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
