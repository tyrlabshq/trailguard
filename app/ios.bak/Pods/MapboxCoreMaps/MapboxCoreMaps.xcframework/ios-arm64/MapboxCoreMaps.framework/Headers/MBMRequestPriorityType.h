// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the priority of a resource request. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRequestPriorityType)
{
    /** The request priority is regular. */
    MBMRequestPriorityTypeRegular,
    /**
     * The request priority is low, and the regular requests are of higher priority
     * than the low-priority requests.
     */
    MBMRequestPriorityTypeLow
} NS_SWIFT_NAME(RequestPriorityType);

NSString* MBMRequestPriorityTypeToString(MBMRequestPriorityType request_priority_type);
