import mongoose, { Schema, Model, Document, AggregatePaginateModel } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { CouponTypeEnum, AvailableCouponTypes } from "../constants";


interface ICoupon extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    couponCode: string;
    type: CouponTypeEnum;
    discountValue: number;
    isActive: boolean;
    minimumCartValue: number;
    startDate: Date;
    expiryDate: Date;
    owner: Schema.Types.ObjectId;

}

const couponSchema: Schema<ICoupon> = new Schema({
    name: {
        type: String,
        required: true,
    },
    couponCode: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        uppercase: true,
    },
    type: {
        type: String,
        enum: AvailableCouponTypes,
        default: CouponTypeEnum.FLAT,
    },
    discountValue: {
        type: Number,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    minimumCartValue: {
        type: Number,
        default: 0,
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    expiryDate: {
        type: Date,
        dafault: null,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }
}, { timestamps: true });


couponSchema.plugin(mongooseAggregatePaginate);

const Coupon: Model<ICoupon> & AggregatePaginateModel<ICoupon> = mongoose.model<ICoupon, AggregatePaginateModel<ICoupon>>("Coupon", couponSchema);

export { Coupon, ICoupon };