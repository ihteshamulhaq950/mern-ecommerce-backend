import crypto from "crypto";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Razorpay from "razorpay";
import {
    AvailableOrderStatuses,
    OrderStatusEnum,
    PaymentProviderEnum,
    paypalBaseUrl,
} from "../constants.js";
import { Address } from "../models/address.model.js";
import { Cart } from "../models/cart.model.js";
import { Order, IOrder } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    orderConfirmationMailgenContent,
    sendEmail
} from "../utils/mail.js";
import { getCart } from "./cart.controllers.js";
import { getMongoosePaginateOptions } from "../utils/helpers.js";
import { Request, Response } from "express";



// * Utility Functions

const generatePaypalAccessToken = async (): Promise<string> => {

    try {

        const auth = Buffer.from(
            process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET
        ).toString("base64");

        const response = await fetch(`${paypalBaseUrl.sandbox}/v1/oauth2/token`, {
            method: "POST",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        const data = await response.json();
        return data?.access_token;

    } catch (error: any) {
        throw new ApiError(500, "Error while generating paypal auth token");
    }
}



/**
 * @description Utility function which is responsible for:
 * * Marking order payment done flag to true
 * * Clearing up the cart
 * * Calculate product's remaining stock
 * * Send mail to the user about order confirmation
 */
const orderFulfillmentHelper = async (orderPaymentId: string, req: Request): Promise<IOrder> => {

    const order = await Order.findOneAndUpdate(
        {
            paymentId: orderPaymentId,
        },
        {
            $set: {
                isPaymentDone: true,
            },
        },
        { new: true }
    );

    if (!order) {
        throw new ApiError(404, "Order does not exist");
    }

    // Get the user's card
    const cart = await Cart.findOne({
        owner: req.user?._id,
    });

    // !! Write correct error string
    if (!cart) {
        throw new ApiError(400, "")
    }

    const userCart = await getCart(req.user?._id.toString()!);

    // Logic to handle product's stock change once order is placed
    let bulkStockUpdates = userCart.items.map((item) => {

        // Reduce the products stock
        return {
            updateOne: {
                filter: { _id: item.product._id },
                update: { $inc: { stock: -item.quantity } }, // substract the item quantity
            },
        };
    });

    // * (bulkWrite()) is faster than sending multiple independent operations (e.g if you use create())
    // * because with bulikWrite() there is only one network round trip to the MongoDB server.
    await Product.bulkWrite(bulkStockUpdates, {
        skipValidation: true,
    });

    await sendEmail({
        to: req.user?.email,
        subject: "Order confirmed",
        mailgenContent: orderConfirmationMailgenContent(
            req.user?.username!,
            userCart.items,
            order.discountedOrderPrice ?? 0 // Send discounted price in the mail which is paid by the user
        ),
    });

    cart.items = []; // empty the cart 
    cart.coupon = null; // remove the associated coupon

    await cart.save({ validateBeforeSave: false });

    return order;
};


/**
 * @description utility function responsible for making paypal api calls for order generation and payment verification
 */
const paypalApi = async (endpoint: string, body: {} = {}) => {

    const accessToken = await generatePaypalAccessToken();

    return await fetch(`${paypalBaseUrl.sandbox}/v2/checkout/orders${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body)
    });

};

let razorpayInstance: any;

try {

    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

} catch (error) {
    console.log("RAZORPAY ERROR: ", error);
}

// * CONTROLLERS

const generateRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {

    const { addressId } = req.body;

    if (!razorpayInstance) {
        console.error("RAZORPAY ERROR: `key_id` is mandatory");
        throw new ApiError(500, "Internal server error");
    }

    // Check if address is valid and is of logged in user's
    const address = await Address.findOne({
        _id: addressId,
        owner: req.user?._id,
    });

    if (!address) {
        throw new ApiError(404, "Address does not exists");
    }

    const cart = await Cart.findOne({
        owner: req.user?._id,
    });

    if (!cart || !cart.items.length) {
        throw new ApiError(400, "User cart is empty");
    }

    const orderItems = cart.items;
    const userCart = await getCart(req.user?._id.toString()!);

    // note down the total cart value and cart value after the discount
    // If no coupon is applied the total and discounted prices will be the same
    const totalPrice = userCart.cartTotal;
    const totalDiscountedPrice = userCart.discountedTotal;


    const orderOptions = {
        amount: +totalDiscountedPrice * 100, // in paisa
        currency: "INR", //  Might accept from client
        receipt: nanoid(10),
    };

    razorpayInstance.orders.create(
        orderOptions,
        async function (err: any, razirpayOrder: any) {
            if (!razirpayOrder || (err && err.error)) {
                // Throwing ApiError here will not trigger the error handler middleware
                return res
                    .status(err.statusCode)
                    .json(
                        new ApiResponse(
                            err.statusCode,
                            null,
                            err.error.reason || "Something went wrong while initialising the razorpat order."
                        )
                    );
            }


            const { addressLine1, addressLine2, city, country, pincode, state } = address;


            // Create an order while we generate razorpay session
            // In case payment is done and there is some network issue in the payment verification api
            // We will at least have a rcord of the order

            const unpaidOrder = await Order.create({
                address: {
                    addressLine1,
                    addressLine2,
                    city,
                    country,
                    pincode,
                    state,
                },
                customer: req.user?._id,
                items: orderItems,
                orderPrice: totalPrice ?? 0,
                discountedOrderPrice: totalDiscountedPrice ?? 0,
                paymentProvider: PaymentProviderEnum.RAZORPAY,
                paymentId: razirpayOrder.id,
                coupon: userCart.coupon._id,
            });

            if (unpaidOrder) {
                // If order is created then only proceed with payment
                return res
                    .status(200)
                    .json(
                        new ApiResponse(200, razirpayOrder, "Razorpay order generated")
                    );
            } else {
                return res
                    .status(500)
                    .json(
                        new ApiResponse(
                            500,
                            null,
                            "Something went wrong while initialising the razorpay order."
                        )
                    );
            }
        }
    );

});


const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    let body = razorpay_order_id + "|" + razorpay_payment_id;

    let expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");


    if (expectedSignature === razorpay_signature) {
        const order = await orderFulfillmentHelper(razorpay_order_id, req);

        return res
            .status(201)
            .json(
                new ApiResponse(201, order, "Order placed successfully")
            );

    } else {
        throw new ApiError(400, "Invalid razorpay signature");
    }

});


const generatePaypalOrder = asyncHandler(async (req: Request, res: Response) => {

    const { addressId } = req.body;

    // Check if address is valid and is of logged in user's
    const address = await Address.findOne({
        _id: addressId,
        owner: req.user?._id,
    });

    if (!address) {
        throw new ApiError(404, "Address does not exists");
    }

    const cart = await Cart.findOne({
        owner: req.user?._id,
    });

    if (!cart || !cart.items.length) {
        throw new ApiError(400, "User cart is empty");
    }

    const orderItems = cart.items; // these items are used further to set product stock
    const userCart = await getCart(req.user?._id.toString()!);

    // note down the total cart value and cart value after the discount
    // If no coupom is applies the total and discounted prices will be the same
    const totalPrice = userCart.cartTotal;
    const totalDiscountedPrice = userCart.discountedTotal;

    const response = await paypalApi("/", {
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: "USD",
                    value: (totalDiscountedPrice * 0.012).toFixed(0), // convert indian rupees to dollars
                },
            },
        ],
    });

    const paypalOrder = await response.json();

    if (paypalOrder?.id) {
        const { addressLine1, addressLine2, city, country, pincode, state } = address;

        // Create an order while we generate paypal session
        // In case payment is done and there is some network issue in the payment verification api 
        // We will at least have a record of th order
        const unpaidOrder = await Order.create({
            address: {
                addressLine1,
                addressLine2,
                city,
                country,
                pincode,
                state,
            },
            customer: req.user?._id,
            items: orderItems,
            orderPrice: totalPrice ?? 0,
            discountedOrderPrice: totalDiscountedPrice ?? 0,
            paymentProvider: PaymentProviderEnum.PAYPAL,
            paymentId: paypalOrder._id,
            coupon: userCart.coupon?._id,
        });

        if (unpaidOrder) {
            // if order is created then only proceed with the payment
            return res
                .status(201)
                .json(
                    new ApiResponse(
                        201,
                        paypalOrder,
                        "Paypal order generated successfully"
                    )
                );
        }
    }
    // If there is no paypal order or unpaidOrder created throw an errror
    console.log(
        "Make sure you have provided your PAYPAL credentials in the .env file"
    );

    throw new ApiError(
        500,
        "Something went wrong while initialising the paypal order."
    );

});


const verifyPaypalPayment = asyncHandler(async (req: Request, res: Response) => {

    const { orderId } = req.body;

    const response = await paypalApi(`/${orderId}/capture`, {});

    const captureData = await response.json();

    if (captureData?.status === "COMPLETED") {
        const order = await orderFulfillmentHelper(
            captureData.id,
            req
        );


        return res
            .status(200)
            .json(
                new ApiResponse(200, order, "Order placed successfully")
            );
    } else {
        throw new ApiError(500, "Something went wrong with the paypal payment");
    }
});

const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {

    const { orderId } = req.params;
    const { status } = req.body;

    let order = await Order.findById(orderId);

    if (!order) {
        throw new ApiError(404, "Order does not exist")
    }

    if (order.status === OrderStatusEnum.DELIVERED) {
        throw new ApiError(400, "Order is already delivered");
    }

    order = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                status,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, { status }, "Order status updated successfully")
        );

});

const getOrderById = asyncHandler(async (req: Request, res: Response) => {

    const { orderId } = req.params;

    const order = await Order.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(orderId),
            }
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
                localField: "coupon",
                foreignField: "_id",
                as: "coupon",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            couponCode: 1
                        },
                    },
                ],
            },
        },
        // lookup returns array so get the first element of address and customer
        {
            $addFields: {
                customer: { $first: "$customer" },
                coupon: { $ifNull: [{ $first: "$coupon" }, null] },
            },
        },
        // Now we have array of orders items with productId being the id of the product that is being ordered
        // So we want to send complete details of that product

        // To do so we first unwind the items array
        { $unwind: "$items" },

        // it gives us documents with items being an object with ket {_id, productId, quantity}
        {
            // lookup for a product associated
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "items.product", // store that looked up product in items.product key

            },
        },

        // As we know lookup will return an array
        // we want product key to be an object not array
        // So, once lookup is done we access first item in an array
        {
            $addFields: {
                "items.product": { $first: "$items.product" },
            },
        },
        // As we have unwind the items array the output of the following stages is not desired one 
        // So to make it desired we need to group whatever we have unwinded
        {
            $group: {
                // we group the documents with `_id` (which is an order id)
                // The reason being, each order is unique and main entity of this api
                _id: "$_id",
                order: { $first: "$$ROOT" }, // we also assign whole root object to be the order
                // we create a new key orderItems in which we will push each order item (product details and quantity) with complete product details
                orderItems: {
                    $push: {
                        _id: "$items._id",
                        quantity: "$items.quantity",
                        product: "$items.product"
                    },
                },
            },
        },
        {
            $project: {
                // ignore the orderItems key as we don;t need it
                orderItems: 0,
            }
        }

    ]);

    if (!order[0]) {
        throw new ApiError(404, "Order does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, order[0], "Order fetched successfully")
        );
});

const getOrderListAdmin = asyncHandler(async (req: Request, res: Response) => {

    const { status, page = 1, limit = 10 } = req.query;

    let matchCondition = {};
    if (typeof status === 'string' && AvailableOrderStatuses.includes(status.toUpperCase() as OrderStatusEnum)) {
        matchCondition = {
            status: status.toUpperCase() as OrderStatusEnum,
        };
    }

    const orderAggregate = Order.aggregate([
        {
            $match: matchCondition,
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
                items: 0,
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
    generateRazorpayOrder,
    verifyRazorpayPayment,
    generatePaypalOrder,
    verifyPaypalPayment,
    updateOrderStatus,
    getOrderById,
    getOrderListAdmin,
};





