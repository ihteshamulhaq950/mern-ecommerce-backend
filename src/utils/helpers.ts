import fs from "fs";
import { Request } from "express";
import { PaginateOptions } from "mongoose";



export const getStaticFilePath = (req: Request, fileName: string): string => {
    return `${req.protocol}://${req.get("host")}/images/${fileName}`;
};


export const getLocalPath = (fileName: string): string => {
    return `public/images/${fileName}`;
};


export const removeLocalFile = (localFile: string): void => {
    fs.unlink(localFile, (err) => {
        if (err) console.log("Error while removing local file", err);
        else console.log("Removed local", localFile);
    });
};


export const getMongoosePaginateOptions = (
    {
        page = 1,
        limit = 10,
        customLabels
    }: PaginateOptions

): PaginateOptions => {

    return {
        page: Math.max(page, 1),
        limit: Math.max(limit, 1),
        pagination: true,
        customLabels: {
            pagingCounter: "serialNumberStartFrom", ...customLabels
        }
    }
}


export const removedUnusedMulterImageFilesOnError = (req: Request): void => {

    try {
        const multerFile = req.file;
        const multerFiles = req.files;

        if (multerFile) {
            removeLocalFile(multerFile.path)
        }

        if (multerFiles) {
            const filesValueArray: Express.Multer.File[][] = Object.values(multerFiles);


            filesValueArray.map((fileFields: Express.Multer.File[]) => {
                fileFields.map((fileObject: Express.Multer.File) => {
                    removeLocalFile(fileObject.path);
                });
            });
        };

    } catch (error) {
        console.log("Error while removing unused multer files[s]", error);

    }
}




