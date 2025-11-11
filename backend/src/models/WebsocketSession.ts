import mongoose, { Document, Schema } from "mongoose";

export interface IWebsocketSession extends Document {
  id: string;
  email: string;
  userId: string;
  start: number;
  end: number;
  orderType: "my" | "all";
  dateStart: Date;
  dateEnd: Date;
  search: string;
  orderIds: string[];
}

const WebsocketSessionSchema = new Schema<IWebsocketSession>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    start: {
      type: Number,
      required: true,
    },
    end: {
      type: Number,
      required: true,
    },
    orderType: {
      type: String,
      enum: ["my", "all"],
      required: true,
    },
    dateStart: {
      type: Date,
      required: false,
    },
    dateEnd: {
      type: Date,
      required: false,
    },
    search: {
      type: String,
      default: "",
    },
    orderIds: {
      type: [String],
      default: [],
    }
  },
  { timestamps: true }
);

// Optional index to improve query performance
WebsocketSessionSchema.index({ userId: 1, createdAt: -1 });

export const WebsocketSession = mongoose.model<IWebsocketSession>(
  "WebsocketSession",
  WebsocketSessionSchema
);
