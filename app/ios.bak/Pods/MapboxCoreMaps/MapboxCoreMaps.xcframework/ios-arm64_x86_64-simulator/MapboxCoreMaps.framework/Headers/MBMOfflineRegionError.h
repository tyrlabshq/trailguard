// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMOfflineRegionErrorType.h>

/** Describes an offline request response error. */
NS_SWIFT_NAME(OfflineRegionError)
__attribute__((visibility ("default")))
__attribute__((deprecated))
@interface MBMOfflineRegionError : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithType:(MBMOfflineRegionErrorType)type
                             message:(nonnull NSString *)message
                             isFatal:(BOOL)isFatal
                          retryAfter:(nullable NSDate *)retryAfter;

/** An error type. */
@property (nonatomic, readonly) MBMOfflineRegionErrorType type;

/** An error message */
@property (nonatomic, readonly, nonnull, copy) NSString *message;

/**
 * A flag indicating that the error is fatal i.e. the region
 * cannot proceed downloading of any resources and it will be
 * put to inactive state.
 */
@property (nonatomic, readonly) BOOL isFatal;

/** Time after which to try again. */
@property (nonatomic, readonly, nullable) NSDate *retryAfter;


@end
