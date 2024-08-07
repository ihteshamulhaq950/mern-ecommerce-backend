import { EcomProfile } from "../models/profile.model.js";
import { Order } from "../models/order.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import { getMongoosePaginateOptions } from "../utils/helpers.js";



const getMyEcomProfile = asyncHandler(async (req: Request, res: Response) => {

    let profile = await EcomProfile.findOne({
        owner: req.user?._id,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, profile, "User profile fetched successfully")
        );
});



const updateEcomProfile = asyncHandler(async (req: Request, res: Response) => {

    const {
        firstName,
        lastName,
        phoneNumber,
        countryCode
    } = req.body;

    const updatedFields: {

        firstName: string;
        lastName: string;
        phoneNumber: string;
        countryCode: string;

    } = {
        ...(firstName && firstName),
        ...(lastName && lastName),
        ...(phoneNumber && phoneNumber),
        ...(countryCode && countryCode),
    }

    const profile = await EcomProfile.findOneAndUpdate(
        {
            owner: req.user?._id,
        },
        {
            $set: {
                ...updatedFields
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                profile,
                "User profile updated successfully"
            )
        );
});


const getMyOrders = asyncHandler(async (req: Request, res: Response) => {

    const { page = 1, limit = 10 } = req.query;

    const orderAggregate = Order.aggregate([
        {
            // Get orders associated with the user
            $match: {
                customer: req.user?._id,
            },
        },
        // lookup for a customer associated with the order
        {
            $lookup: {
                from: "users",
                localField: "customer",
                foreignField: "_id",
                as: "customer",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },
        // lookup for a coupon applied while placing the order
        {
            $lookup: {
                from: "coupons",
                foreignField: "_id",
                localField: "coupon",
                as: "coupon",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            couponCode: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                customer: { $first: "$customer" },
                coupon: { $ifNull: [{ $first: "$coupon" }, null] },
                totalOrderItems: { $size: "$items" },
            },
        },
        {
            $project: {
                items: 0
            },
        },
    ]);


    const orders = await Order.aggregatePaginate(
        orderAggregate,
        getMongoosePaginateOptions({
            page: +page,
            limit: +limit,
            customLabels: {
                totalDocs: "totalOrders",
                docs: "orders",
            },
        })
    );


    return res
        .status(200)
        .json(
            new ApiResponse(200, orders, "Orders fetched successfully")
        );
});


export {
    getMyEcomProfile,
    updateEcomProfile,
    getMyOrders
};