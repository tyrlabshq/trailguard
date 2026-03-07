// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * A style needs an image that is missing from the sprite sheet. This event is
 * emitted when the `map` renders visible tiles, and one of the required images
 * is missing in the sprite sheet. The event observer has to provide the missing
 * image by calling the `addStyleImage` method.
 *
 * Note: Images added as a result of the `StyleImageMissing` event will be treated
 * as user-added images, and when the engine no longer needs a user-provided image,
 * the `map` will emit `StyleImageRemoveUnused` event.
 */
NS_SWIFT_NAME(StyleImageMissing)
__attribute__((visibility ("default")))
@interface MBMStyleImageMissing : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithImageId:(nonnull NSString *)imageId
                              timestamp:(nonnull NSDate *)timestamp;

/** The identifier of a missing image. */
@property (nonatomic, readonly, nonnull, copy) NSString *imageId;

/** The timestamp of an event when the `map` requested a missing image. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
