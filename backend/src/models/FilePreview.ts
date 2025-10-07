import mongoose, { Document, Schema } from 'mongoose';

export interface IFilePreview extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  previewUrl: string;
  fileType: string;
  createdAt: Date;
}

const FilePreviewSchema = new Schema<IFilePreview>({
  userId: {
    type: Schema.Types.ObjectId,
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
    required: true
  },
  fileType: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
FilePreviewSchema.index({ userId: 1 });
FilePreviewSchema.index({ previewUrl: 1 });

export const FilePreview = mongoose.model<IFilePreview>('FilePreview', FilePreviewSchema);
