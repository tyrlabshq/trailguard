// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the method used to make a resource request. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRequestLoadingMethodType)
{
    /** The engine should try loading a resource from the network. */
    MBMRequestLoadingMethodTypeNetwork,
    /** The engine should try loading a resource from the cache. */
    MBMRequestLoadingMethodTypeCache
} NS_SWIFT_NAME(RequestLoadingMethodType);

NSString* MBMRequestLoadingMethodTypeToString(MBMRequestLoadingMethodType request_loading_method_type);
