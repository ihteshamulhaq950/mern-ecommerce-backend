import mongoose, { Schema, Model, Document } from "mongoose";


interface ISocialProfile extends Document {
    _id: Schema.Types.ObjectId;
    coverImage: {
        url: string;
        localPath: string;
    };
    firstName: string;
    lastName: string;
    bio: string;
    dob: Date;
    location: string;
    countryCode: string;
    phoneNumber: string;
    owner: Schema.Types.ObjectId;

}

const socialProfileSchema: Schema<ISocialProfile> = new Schema({
    coverImage: {
        type: {
            url: String,
            localPath: String,
        },
        default: {
            url: `https://via.placeholder.com/800x450.png`,
            localPath: "",
        }
    },
    firstName: {
        type: String,
        default: "John",
    },
    lastName: {
        type: String,
        default: "Doe",
    },
    bio: {
        type: String,
        default: null,
    },
    dob: {
        type: Date,
        default: null,
    },
    location: {
        type: String,
        default: "",
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


export const SocialProfile: Model<ISocialProfile> = mongoose.model<ISocialProfile>("SocialProfile", socialProfileSchema);

