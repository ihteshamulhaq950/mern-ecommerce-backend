import mongoose, { Schema, Model, Document, AggregatePaginateModel } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import {
    OrderStatusEnum,
    AvailableOrderStatuses,
    PaymentProviderEnum,
    AvailablePaymentProviders
} from "../constants.js";


interface IOrder extends Document {
    _id: Schema.Types.ObjectId;
    orderPrice: number;
    discountedOrderPrice: number;
    coupon: Schema.Types.ObjectId;
    customer: Schema.Types.ObjectId;
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
    }[];
    address: {
        addressLine1: string;
        addressLine2: string;
        city: string;
        country: string;
        pincode: string;
        state: string;
    };
    status: OrderStatusEnum;
    paymentProvider: PaymentProviderEnum;
    paymentId: string;
    isPaymentDone: boolean;

}

const orderSchema: Schema<IOrder> = new Schema({
    orderPrice: {
        type: Number,
        required: true,
    },
    discountedOrderPrice: {
        type: Number,
        required: true,

    },
    coupon: {
        type: Schema.Types.ObjectId,
        ref: "Coupon",
    },
    customer: {
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
                }
            }
        ],
        default: [],
    },
    address: {
        addressLine1: {
            required: true,
            type: String,
        },
        addressLine2: {
            type: String,
        },
        city: {
            required: true,
            type: String,
        },
        country: {
            required: true,
            type: String,
        },
        pincode: {
            required: true,
            type: String,
        },
        state: {
            required: true,
            type: String,
        },

    },
    status: {
        type: String,
        enum: AvailableOrderStatuses,
        default: OrderStatusEnum.PENDING,
    },
    paymentProvider: {
        type: String,
        enum: AvailablePaymentProviders,
        default: PaymentProviderEnum.UNKNOWN,
    },
    paymentId: {
        type: String,
    },
    isPaymentDone: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


orderSchema.plugin(mongooseAggregatePaginate);


const Order: Model<IOrder> & AggregatePaginateModel<IOrder> = mongoose.model<IOrder, AggregatePaginateModel<IOrder>>("Order", orderSchema);

export { Order, IOrder };