import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  __id: string; 
  authorId: string;
  body: string | null;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
  chatId: string;
  isChanged: boolean; 
}

const CommentSchema = new Schema<IComment>({
  __id: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true
  },
  body: {
    type: String,
  },
  createdAt: {
    type: String,
    default: Date.now.toString()
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
  },
  createdAt: {
    type: String,
    default: Date.now.toString()
  },
  updatedAt: {
    type: String,
    default: Date.now.toString()
  }
}, {
  timestamps: true
});

// Indexes for performance
MessageSchema.index({ userId: 1, targetId: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 });
MessageSchema.index({ authorId: 1 });

CommentSchema.index({__id: 1});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
