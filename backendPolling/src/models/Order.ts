import mongoose, { Document, Schema } from 'mongoose';
import { ELMATicket } from '../data/types';

export interface IOrder extends Document {
  userId: string;
  elmaId: string;
  orderData: ELMATicket;
  status: string;
  isChanged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  userId: {
    type: String,
    ref: 'User', // this is users table so this id from userId
    required: true
  },
  elmaId: {
    type: String,
    required: true,
    unique: false
  },
  orderData: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    default: 'active'
  },
  isChanged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ isChanged: 1 });
OrderSchema.index({ status: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
