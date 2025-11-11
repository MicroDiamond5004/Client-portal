import mongoose, { Document, Schema } from "mongoose"

export interface IPassport extends Document {
    userId: string;
    passportId: string | undefined;
    name: string | undefined;
    passportData: string | undefined;
}

const PassportSchema = new Schema<IPassport>({
    userId: {
        type: String,
        require: true,
        ref: 'User',
    },
    passportId: {
        type: String,
        require: true,
    },
    name: {
        type: String,
        require: true,
    },
    passportData: {
        type: String,
        required: true,
    }
});

PassportSchema.index({ userId: 1, createdAt: -1 });
PassportSchema.index({ name: 1 });
PassportSchema.index({ passportData: 1 });

export const Passport = mongoose.model<IPassport>('Passport', PassportSchema);
