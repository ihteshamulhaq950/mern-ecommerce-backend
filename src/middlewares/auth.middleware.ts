import { UserRolesEnum } from "../constants.js";
import { User, IUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";


declare module 'express' {
    interface Request {
        user?: IUser;
    }
};


interface IDcecodedAccessToken {
    _id: string;
    email: string;
    username: string;
    role: UserRolesEnum;
}


export const verifyJWT = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    console.log('token in auth is:', token);

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }


    try {

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as IDcecodedAccessToken;

        console.log('process.env.ACCESS_TOKEN_SECRET is:', process.env.ACCESS_TOKEN_SECRET)
        console.log('decodedToken is:', decodedToken);

        // * decodedToken output is what payload you have encode during token generation
        // * in this case its ouput will be:
        /**
             * decodedToken = {
             *  _id: ....,
             * email: ....,
             * username: ....,
             * role: .....,
             * }
         */

        console.log('decodedToken._id is:', decodedToken._id);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
        );

        console.log('user is:', user);

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();


    } catch (error: any) {

    }

})


