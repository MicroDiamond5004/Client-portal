import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  clientName: string;
  clientId: string;
  company?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  token: string;
  cookie: string;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  cookie: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ clientId: 1 }, { unique: true });
UserSchema.index({ company: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
