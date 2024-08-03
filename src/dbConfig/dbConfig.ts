import mongoose, { Connection } from "mongoose";
import { DB_NAME } from "../constants.js";


export let dbInstance: Connection | undefined = undefined;


const connectDB = async (): Promise<void> => {

    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        dbInstance = mongoose.connection;
        console.log(`Connected to ${DB_NAME} \n ${dbInstance.host}`);


    } catch (error: any) {
        console.log("MongoDB connection error:", error);
        process.exit(1);

    }
}

export default connectDB;