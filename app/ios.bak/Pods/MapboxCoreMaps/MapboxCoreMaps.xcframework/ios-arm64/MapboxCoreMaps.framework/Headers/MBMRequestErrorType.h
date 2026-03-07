// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the error type that may occur during a resource request. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRequestErrorType)
{
    /** No error occurred during the resource request. */
    MBMRequestErrorTypeSuccess,
    /** The requested resource is not found. */
    MBMRequestErrorTypeNotFound,
    /** The server error has occured. */
    MBMRequestErrorTypeServer,
    /** The connection error has occured. */
    MBMRequestErrorTypeConnection,
    /** The resource cannot be loaded due to the rate limiting. */
    MBMRequestErrorTypeRateLimit,
    /** The resource cannot be loaded because the device is in offline mode. */
    MBMRequestErrorTypeInOfflineMode,
    /** An unknown error has occurred. */
    MBMRequestErrorTypeOther
} NS_SWIFT_NAME(RequestErrorType);

NSString* MBMRequestErrorTypeToString(MBMRequestErrorType request_error_type);
