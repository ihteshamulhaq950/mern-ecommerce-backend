import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { removedUnusedMulterImageFilesOnError } from "../utils/helpers.js";
import { Request, Response, NextFunction } from "express";


const errorHandler = (err: any, req: Request, res: Response, _: NextFunction) => {

    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || error instanceof mongoose.Error ? 400 : 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack)
    }


    const response = {
        ...error,
        message: error.message,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
    };


    removedUnusedMulterImageFilesOnError(req);


    return res
        .status(error.statusCode)
        .json(response)
}