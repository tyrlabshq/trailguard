// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Describes the reason for an offline request response error. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMOfflineRegionErrorType)
{
    /** The resource is not found. */
    MBMOfflineRegionErrorTypeNotFound,
    /** The server error. */
    MBMOfflineRegionErrorTypeServer,
    /** The connection error. */
    MBMOfflineRegionErrorTypeConnection,
    /** The error happened because of a rate limit. */
    MBMOfflineRegionErrorTypeRateLimit,
    /** There is no available space to store the resources. */
    MBMOfflineRegionErrorTypeDiskFull,
    /** The limit on the number of Mapbox tiles stored for offline regions has been reached. */
    MBMOfflineRegionErrorTypeTileCountLimitExceeded,
    /** Other reason. */
    MBMOfflineRegionErrorTypeOther
} NS_SWIFT_NAME(OfflineRegionErrorType) __attribute__((deprecated));
