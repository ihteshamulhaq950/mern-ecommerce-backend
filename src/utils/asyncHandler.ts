import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "./ApiResponse.js";



const asyncHandler = (

    requestHandler: (
        req: Request,
        res: Response,
        next: NextFunction

    ) => Promise<Response<ApiResponse>> | Promise<void>

): (req: Request, res: Response, next: NextFunction) => Promise<void> => {

    return async (req: Request, res: Response, next: NextFunction) => {

        try {
            await requestHandler(req, res, next);
        } catch (error: any) {
            next(error);
        }
    }
};


export { asyncHandler };
