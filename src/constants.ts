export const DB_NAME: string = "ecommerce"

export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 MINUTES


// export type CouponType = typeof CouponTypeEnum[keyof typeof CouponTypeEnum];

// Create a regular enum
export enum CouponTypeEnum {
    FLAT = "FLAT",
    // PERCENTAGE = "PERCENTAGE",
}

// Create array of values from enum
export const AvailableCouponTypes: CouponTypeEnum[] = Object.values(CouponTypeEnum);

// Example usage
console.log(AvailableCouponTypes); // Output: ["FLAT", "PERCENTAGE"]



export enum OrderStatusEnum {
    PENDING = "PENDING",
    CANCELLED = "CANCELLED",
    DELIVERED = "DELIVERED",
};

export const AvailableOrderStatuses: OrderStatusEnum[] = Object.values(OrderStatusEnum);


export enum PaymentProviderEnum {
    UNKNOWN = "UNKNOWN",
    RAZORPAY = "RAZORPAY",
    PAYPAL = "PAYPAL",
};

export const AvailablePaymentProviders: PaymentProviderEnum[] = Object.values(PaymentProviderEnum);



export enum UserLoginEnum {
    GOOGLE = "GOOGLE",
    GITHUB = "GITHUB",
    EMAIL_PASSWORD = "EMAIL_PASSWORD",
};

export const AvailableSocialLogins: UserLoginEnum[] = Object.values(UserLoginEnum);


export enum UserRolesEnum {
    ADMIN = "ADMIN",
    USER = "USER",
};

export const AvailableUserRoles: UserRolesEnum[] = Object.values(UserRolesEnum);


