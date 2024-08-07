import mongoose, { Schema, Model, Document, Types } from "mongoose";


// Define the CartItem interface separately
interface ICartItem {
    productId: Types.ObjectId; // Use Types.ObjectId for defining ObjectId type
    quantity: number;
}

interface ICart extends Document {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    items: ICartItem[];
    coupon: Schema.Types.ObjectId | null;
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


const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);

export { Cart, ICart };