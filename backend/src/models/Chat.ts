import mongoose, { Document, Schema } from "mongoose";

export interface IChat extends Document {
  name: string;
  id: string;
  taskId: string;
  isChanged: string[];
}

const ChatSchema = new Schema<IChat>(
  {
    name: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
      unique: true,
    },
    taskId: {
      type: String,
      required: true,
    },
    isChanged: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Example index (you can adjust depending on your use case)
ChatSchema.index({ id: 1, createdAt: -1 });

export const Chat = mongoose.model<IChat>("Chat", ChatSchema);
