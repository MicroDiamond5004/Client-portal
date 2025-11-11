import mongoose, { Document, Schema } from 'mongoose';

export interface IFilePreview extends Document {
  userId: string;
  fileName: string;
  fileUrl: string;
  previewUrl: string;
  fileType: string;
  createdAt: Date;
  fileId: string;
}

const FilePreviewSchema = new Schema<IFilePreview>({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  previewUrl: {
    type: String,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileId: {
    type: String,
    required: true,
  }
}, {
  timestamps: true
});

// Indexes for performance
FilePreviewSchema.index({ userId: 1 });

export const FilePreview = mongoose.model<IFilePreview>('FilePreview', FilePreviewSchema);
