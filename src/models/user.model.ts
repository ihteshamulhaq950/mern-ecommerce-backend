import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose, { Schema, Model, Document } from "mongoose";
import { EcomProfile } from "../models/profile.model.js";
import { Cart } from "./cart.model.js";
import { SocialProfile } from "./socialProfile.model.js";
import {
    UserLoginEnum,
    AvailableSocialLogins,
    UserRolesEnum,
    AvailableUserRoles,
    USER_TEMPORARY_TOKEN_EXPIRY
} from "../constants.js";


interface IGenerateTemporaryToken {
    unHashedToken: string;
    hashedToken: string;
    tokenExpiry: Date;
}

interface IUser extends Document {
    _id: Schema.Types.ObjectId;
    avatar: {
        url: string;
        localPath: string;
    };
    username: string;
    email: string;
    role: UserRolesEnum;
    password: string;
    loginType: UserLoginEnum;
    isEmailVerified: boolean;
    refreshToken: string;
    forgotPasswordToken: string;
    forgotPasswordTokenExpiry: Date;
    emailVerificationToken: string;
    emailVerificationTokenExpiry: Date;
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
    generateTemporaryToken(): IGenerateTemporaryToken;

}

const userSchema: Schema<IUser> = new Schema({
    avatar: {
        type: {
            url: String,
            localPath: String,
        },
        default: {
            url: `https://via.placeholder.com/200x200.png`,
            localPath: "",
        },
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    role: {
        type: String,
        enum: AvailableUserRoles,
        default: UserRolesEnum.USER,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    loginType: {
        type: String,
        enum: AvailableSocialLogins,
        default: UserLoginEnum.EMAIL_PASSWORD,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
    },
    forgotPasswordToken: {
        type: String,
    },
    forgotPasswordTokenExpiry: {
        type: Date,
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpiry: {
        type: Date,
    },
}, { timestamps: true });


// Before saving User document
userSchema.pre<IUser>("save", async function (next: (err?: Error) => void) {
    try {
        if (!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error: any) {
        next(error);
    }
});


// after operation on document
userSchema.post<IUser>("save", async function (user: IUser, next: (err?: Error) => void) {
    try {
        const ecomProfile = await EcomProfile.findOne({
            owner: user._id
        });

        if (!ecomProfile) {
            await EcomProfile.create({
                owner: user._id
            })
        };

        const cart = await Cart.findOne({
            owner: user._id
        });

        if (!cart) {
            await Cart.create({
                owner: user._id,
                items: []
            })
        };

        const socialProfile = await SocialProfile.findOne({
            owner: user._id
        });


        // Setup necessary social media models for the user
        if (!socialProfile) {
            await SocialProfile.create({
                owner: user._id
            })
        };

        next();

    } catch (error: any) {
        next(error);
    }
});


userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}


userSchema.methods.generatedAccessToken = function (this: IUser): string {

    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.ACCESS_TOKEN_EXPIRY) {
        throw new Error("ACCESS_TOKEN_SECRET or ACCESS_TOKEN_EXPIRY not found in environment variables.")
    };

    return jwt.sign(
        {

            _id: this._id,
            email: this.email,
            username: this.username,
            role: this.role,
        },
        process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
    );
}


userSchema.methods.generatedRefreshToken = function (this: IUser): string {

    if (!process.env.REFRESH_TOKEN_SECRET || !process.env.REFRESH_TOKEN_EXPIRY) {
        throw new Error("REFRESH_TOKEN_SECRET or REFRESH_TOKEN_EXPIRY not found in environment variables.");
    };

    return jwt.sign(
        {
            _id: this._id,
        }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
    );
};


userSchema.methods.generateTemporaryToken = function (): IGenerateTemporaryToken {

    const unHashedToken = crypto
        .randomBytes(20)
        .toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex");


    const tokenExpiryTimestamp = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;
    const tokenExpiry = new Date(tokenExpiryTimestamp);

    return {
        unHashedToken,
        hashedToken,
        tokenExpiry,
    }

};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export {
    User,
    IUser
};