import mongoose, { Schema, Model, Document, AggregatePaginateModel } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


interface IProduct extends Document {
    _id: Schema.Types.ObjectId;
    category: Schema.Types.ObjectId;
    description: string;
    mainImage: {
        url: string;
        localPath: string;
    };
    name: string;
    owner: Schema.Types.ObjectId;
    price: number;
    stock: number;
    subImages: {
        _id: Schema.Types.ObjectId;
        url: string;
        localPath: string;
    }[];

}

const productSchema: Schema<IProduct> = new Schema({
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    description: {
        required: true,
        type: String,
    },
    mainImage: {
        required: true,
        type: {
            url: String,
            localPath: String,
        },
    },
    name: {
        required: true,
        type: String,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    price: {
        default: 0,
        type: Number,
    },
    stock: {
        default: 0,
        type: Number,
    },
    subImages: {
        type: [
            {
                url: String,
                localPath: String,
            },
        ],
        default: [],
    },
}, { timestamps: true });

productSchema.plugin(mongooseAggregatePaginate);

const Product: Model<IProduct> & AggregatePaginateModel<IProduct> = mongoose.model<IProduct, AggregatePaginateModel<IProduct>>("Product", productSchema);

export { Product, IProduct };