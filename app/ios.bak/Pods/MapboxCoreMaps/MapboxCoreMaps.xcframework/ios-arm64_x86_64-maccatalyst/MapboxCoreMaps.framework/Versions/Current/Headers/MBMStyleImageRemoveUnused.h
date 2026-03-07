// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * An image requested by the `map` through the `StyleImageMissing` event is no longer
 * needed and can be removed using the `removeStyleImage` method. The application can
 * decide whether the image should be kept or removed.
 *
 * Note: If there are no subscribers for the `StyleImageRemoveUnused` event, the `map`
 * will automatically remove the unused image.
 */
NS_SWIFT_NAME(StyleImageRemoveUnused)
__attribute__((visibility ("default")))
@interface MBMStyleImageRemoveUnused : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithImageId:(nonnull NSString *)imageId
                              timestamp:(nonnull NSDate *)timestamp;

/** The identifier of an image that is not used by the `map`. */
@property (nonatomic, readonly, nonnull, copy) NSString *imageId;

/** The timestamp of an event when the `map` no longer needs a previously added image. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
