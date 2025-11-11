import mongoose, { Document, Schema } from "mongoose";

export interface IAuthor extends Document {
    authorId: string;
    name: string;
}

const AuthorSchema = new Schema<IAuthor>({
    authorId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
    }
})

AuthorSchema.index({ authorId: 1, createdAt: -1 }, {unique: true});

export const Author = mongoose.model<IAuthor>('Author', AuthorSchema);