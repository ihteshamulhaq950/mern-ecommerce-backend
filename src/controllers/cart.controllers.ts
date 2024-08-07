import { Cart } from "../models/cart.model.js";
import { ICoupon } from "../models/coupon.model.js";
import { Product, IProduct } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import mongoose from "mongoose";

export const getCart = async (userId: string): Promise<{
    _id: string;
    items: {
        _id: string;
        product: IProduct;
        quantity: number;
    }[];
    cartTotal: number;
    discountedTotal: number;
    coupon: ICoupon
}> => {
    const cartAggregation = await Cart.aggregate([
        {
            $match: {
                owner: userId,
            }
        },
        {
            $unwind: "$items",
        },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product",
            }
        },
        {
            $project: {
                // _id:0
                product: { $first: "$products" },
                quantity: "$items.quantity",
                coupon: 1, // also project coupon field
            },
        },
        {
            $group: {
                _id: "$_id",
                items: {
                    $push: "$$ROOT",
                },
                coupon: { $first: "$coupon" }, // get first value of coupon after grouping
                cartTotal: {
                    $sum: {
                        $multiply: ["$product.price", "$quantity"], // calculate the cart total based on product price * total quantity
                    },
                },
            },
        },
        {
            $lookup: {
                //lookup for the coupon
                from: "coupons",
                localField: "coupon",
                foreignField: "_id",
                as: "coupon",
            },
        },
        {
            $addFields: {
                // As lookup returns an array we access the first item in the lookup array
                coupon: { $first: "$coupon" },
            },
        },
        {
            $addFields: {
                discountedTotal: {
                    // Final total is the total we get once user applies any coupon
                    //final total is toal cart value- coupon's discount value
                    $ifNull: [
                        {
                            $subtract: ["$cartTotal", "$coupon.discountValue"],
                        },
                        "$cartTotal", // if there is no coupon applied we will set no cart total as out final total
                    ],
                },
            },
        },
    ]);


    return (
        cartAggregation[0] ?? {
            _id: null,
            items: [],
            cartTotal: 0,
            discountedTotal: 0,
        }
    );
};




const getUserCart = asyncHandler(async (req: Request, res: Response) => {

    if (!req.user?._id) {
        throw new ApiError(400, "Unauthorized request")
    }

    let cart = await getCart(req.user?._id.toString());

    return res
        .status(200)
        .json(
            new ApiResponse(200, cart, "Cart fetched successfully")
        );
});

const addItemOrUpdateItemQuantity = asyncHandler(async (req: Request, res: Response): Promise<Response<ApiResponse>> => {

    const { productId } = req.params;
    const { quantity = 1 } = req.body;

    if (!productId) {
        throw new ApiError(400, "ProductId missing")
    }
    // fetch user cart
    let cart = await Cart.findOne({
        owner: req.user?._id,
    });

    // Check if user is logged in
    if (!req.user?._id) {
        throw new ApiError(400, "Unauthorized request")
    }

    // If user is logged in check if user has a cart
    if (!cart) {
        // If user does not have a cart create a new cart for the user
        cart = await Cart.create({
            owner: req.user?._id,
            items: [],
        });
    }


    // See if product that user is adding exist in the db
    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product does not exist");
    };

    // If product is there check if the quantity that user is adding is less than or equal to the product's stcok
    if (quantity > product.stock) {
        //If quantity is greater throw an error
        throw new ApiError(
            400,
            product.stock > 0 ? "Only " + product.stock + " products are remaining. But you are adding " + quantity
                : "Product is out of stock"
        );
    };

    // See if the product that user is adding already exists in the cart
    const addedProduct = cart?.items.find((item) => item.productId.toString() === productId);

    if (addedProduct) {
        // If product already exist assign a new quantity to it
        // ! We are not adding or subtracting quantity to keep it dynamic. Frontend will send us updated quantity here
        addedProduct.quantity = quantity;

        // if user updates the cart remove the coupon associated with the cart to avoid misuse
        // Do this only if quantity changes because if user adds a new project the cart total will increase anuways
        if (cart?.coupon) {
            cart.coupon = null;
        }

    } else {
        // If its a new product being added in the cart push it to the cart items

        cart.items.push({
            productId: new mongoose.Types.ObjectId(productId),
            quantity,
        });

    }

    // Finally save the cart
    await cart.save({ validateBeforeSave: true });


    const newCart = await getCart(req.user._id.toString());


    return res
        .status(200)
        .json(
            new ApiResponse(200, newCart, "Item added to cart successfully")
        );

});



const removeItemFromCart = asyncHandler(async (req: Request, res: Response) => {

    const { productId } = req.params;

    const product = await Product.findById(productId);

    // Check for product existence 
    if (!product) {
        throw new ApiError(404, "Product does not exist");
    }

    const updatedCart = await Cart.findOneAndUpdate(
        {
            owner: req.user?._id,
        },
        {
            $pull: {
                items: {
                    productId: new mongoose.Types.ObjectId(productId),
                },
            },
        },
        { new: true }
    );

    if (!updatedCart) {
        throw new ApiError(404, "Cart does not exist");
    }


    let cart = await getCart(req.user?._id.toString()!);

    // Check if the cart's new total is greater than the minimum cart total requirement of the coupon
    if (cart.coupon && cart.cartTotal < cart.coupon.minimumCartValue) {
        // If it is less than minimum cart value remove the coupon code which is applied
        updatedCart.coupon = null;

        await updatedCart?.save({ validateBeforeSave: true });

        // fetch the latest updated cart
        cart = await getCart(req.user?._id.toString()!);
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, cart, "Item removed from cart successfully")
        );

});


const clearCart = asyncHandler(async (req: Request, res: Response) => {

    await Cart.findOneAndUpdate(
        {
            owner: req.user?._id,
        },
        {
            $set: {
                items: [],
                coupon: null,
            },
        },
        { new: true }
    );

    const cart = await getCart(req.user?._id.toString()!);


    return res
        .status(200)
        .json(
            new ApiResponse(200, cart, "Cart cleared successfully")
        );
})



export {
    getUserCart,
    addItemOrUpdateItemQuantity,
    removeItemFromCart,
    clearCart,
};




