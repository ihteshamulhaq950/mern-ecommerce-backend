import mongoose, { Schema, Model, Document, AggregatePaginateModel } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

interface IAddress extends Document {
    _id: Schema.Types.ObjectId;
    addressLine1: string;
    addressLine2: string;
    city: string;
    country: string;
    owner: Schema.Types.ObjectId;
    pincode: string;
    state: string;
}

const addressSchema: Schema<IAddress> = new Schema<IAddress>({
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
    owner: {
        ref: "User",
        type: Schema.Types.ObjectId,
    },
    pincode: {
        required: true,
        type: String,
    },
    state: {
        required: true,
        type: String,
    },
}, { timestamps: true });


addressSchema.plugin(mongooseAggregatePaginate);

export const Address: Model<IAddress> & AggregatePaginateModel<IAddress> = mongoose.model<IAddress, AggregatePaginateModel<IAddress>>("Address", addressSchema);