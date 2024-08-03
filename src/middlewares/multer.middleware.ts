import multer from "multer";
import { Request } from "express";


const storage: multer.StorageEngine = multer.diskStorage(
    {
        destination: function (

            req: Request,
            file: Express.Multer.File,
            cb: (

                error: Error | null,
                destination: string
            ) => void

        ): void {
            cb(null, "public/images");
        },

        filename: function (

            req: Request,
            file: Express.Multer.File,
            cb: (

                error: Error | null,
                fileName: string
            ) => void


        ): void {
            let fileExtension = "";
            if (file.originalname.split(".").length > 1) {
                fileExtension = file.originalname.substring(
                    file.originalname.lastIndexOf(".")
                )
            }


            const filenameWithoutExtension = file.originalname
                .toLowerCase()
                .split(" ")
                .join("-")
                ?.split(".")[0];


            cb(
                null,
                filenameWithoutExtension + Date.now() + Math.ceil(Math.random() * 1e5) + fileExtension
            );
        }
    }
);


const upload: multer.Multer = multer({
    storage: storage
});

export { upload }