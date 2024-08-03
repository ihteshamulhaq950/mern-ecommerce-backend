import mongoose, { Schema, Model, Document } from "mongoose";


interface ICart extends Document {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
    }[];
    coupon: Schema.Types.ObjectId;
};


const cartSchema: Schema<ICart> = new Schema<ICart>({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    items: {
        type: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: [1, "Quantity can not be less than 1."],
                    default: 1,
                },
            },
        ],
        default: [],
    },
    coupon: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
    },
}, { timestamps: true });


export const Cart: Model<ICart> = mongoose.model("Cart", cartSchema);