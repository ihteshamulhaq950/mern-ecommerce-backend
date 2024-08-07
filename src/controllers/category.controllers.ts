import { Category } from "../models/category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMongoosePaginateOptions } from "../utils/helpers.js";
import { Request, Response } from "express";


const createCategory = asyncHandler(async (req: Request, res: Response) => {

    const { name } = req.body;

    const category = await Category.create({
        name,
        owner: req.user?._id,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                category,
                "Category created successfully"
            )
        );
});


const getAllCategories = asyncHandler(async (req: Request, res: Response) => {

    const { page = 1, limit = 10 } = req.query;

    const categoryAggregate = Category.aggregate([
        {
            $match: {}
        },
    ]);

    const categories = await Category.aggregatePaginate(
        categoryAggregate,
        getMongoosePaginateOptions({
            page: +page,
            limit: +limit,
            customLabels: {
                totalDocs: "totalCategories",
                docs: "categories",
            },
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                categories,
                "Categories fetched successfully"
            )
        );
});


const getCategoryById = asyncHandler(async (req: Request, res: Response) => {

    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);

    if (!category) {
        throw new ApiError(
            404,
            "Category does not exist"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, category, "Category fetched successfully")
        );
});


const updateCategory = asyncHandler(async (req: Request, res: Response) => {

    const { categoryId } = req.params;
    const { name } = req.body;

    const category = await Category.findByIdAndUpdate(
        categoryId,
        {
            $set: {
                name,
            },
        },
    );

    if (!category) {
        throw new ApiError(404, "Category does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, category, "Category updated successfully")
        );
});


const deleteCategory = asyncHandler(async (req: Request, res: Response) => {

    const { categoryId } = req.params;

    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
        throw new ApiError(404, "Category does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { deleteCategory: category },
                "Category deleted successfully"
            )
        );
});



export {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
}