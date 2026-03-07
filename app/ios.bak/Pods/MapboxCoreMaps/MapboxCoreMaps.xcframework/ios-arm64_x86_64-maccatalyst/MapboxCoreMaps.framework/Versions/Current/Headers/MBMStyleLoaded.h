// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMEventTimeInterval;

/**
 * The requested style has been fully loaded, including specified sprite, and sources' metadata.
 *
 * Note: The style specified sprite would be marked as loaded even with a sprite loading error
 * (an error will be emitted via `MapLoadingError`). Sprite loading error is not fatal, and
 * won't block the map rendering; thus, the event will still be emitted if the
 * style and sources are fully loaded.
 */
NS_SWIFT_NAME(StyleLoaded)
__attribute__((visibility ("default")))
@interface MBMStyleLoaded : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTimeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/** The `timeInterval.begin` is when the style begins loading, and the `timeInterval.end` is when the style is loaded. */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
