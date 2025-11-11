import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  authorId: string;
  body: string | null;
  createdAt: Date;
}

export interface IMessage extends Document {
  __id: string;
  userId: string;
  clientId: string;
  targetId: string;
  authorId: string;
  body: string | null;
  comments: IComment[];
  unreadCommentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  chatId: string;
  isChanged: boolean; 
}

const CommentSchema = new Schema<IComment>({
  authorId: {
    type: String,
    required: true
  },
  body: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MessageSchema = new Schema<IMessage>({
  __id: {
    type: String,
    required: true,
  },
  chatId: {
    type: String,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  targetId: {
    type: String,
    required: true,
    ref: 'Order',
  },
  authorId: {
    type: String,
    required: true
  },
  body: {
    type: String,
  },
  isChanged: {
    type: Boolean,
    default: false
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
