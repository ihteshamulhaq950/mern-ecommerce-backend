import mongoose, { Schema, Model, Document, AggregatePaginateModel } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


interface ICategory extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    owner: Schema.Types.ObjectId;
}


const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }
}, { timestamps: true });


categorySchema.plugin(mongooseAggregatePaginate);

export const Category: Model<ICategory> & AggregatePaginateModel<ICategory> = mongoose.model<ICategory, AggregatePaginateModel<ICategory>>("Category", categorySchema);
