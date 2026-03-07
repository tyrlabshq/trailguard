// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMRequestErrorType.h>

/** The structure defines the information about errors that may occur during a resource request. */
NS_SWIFT_NAME(ResourceRequestError)
__attribute__((visibility ("default")))
@interface MBMResourceRequestError : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithReason:(MBMRequestErrorType)reason
                               message:(nonnull NSString *)message;

/** The error type. */
@property (nonatomic, readonly) MBMRequestErrorType reason;

/** The description of an error. */
@property (nonatomic, readonly, nonnull, copy) NSString *message;


@end
