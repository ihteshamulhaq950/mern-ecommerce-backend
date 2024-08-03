import { body } from "express-validator";


export const mongoIdRequestBodyValidator = (idName: string) => {

    return [
        body(idName)
            .notEmpty()
            .isMongoId()
            .withMessage(`Invalid ${idName}`)
    ];
};