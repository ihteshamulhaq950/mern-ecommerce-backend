import mongoose, { Schema, Model, Document } from "mongoose";


interface IProfile extends Document {
    _id: Schema.Types.ObjectId;
    firstName: string;
    lastName: string;
    countryCode: string;
    phoneNumber: string;
    owner: Schema.Types.ObjectId;
}

const profileSchema = new Schema<IProfile>({
    firstName: {
        type: String,
        default: "John",
    },
    lastName: {
        type: String,
        default: "Doe",
    },
    countryCode: {
        type: String,
        default: "",
    },
    phoneNumber: {
        type: String,
        default: "",
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }

}, { timestamps: true });


export const EcomProfile: Model<IProfile> = mongoose.model<IProfile>("EcomProfile", profileSchema);