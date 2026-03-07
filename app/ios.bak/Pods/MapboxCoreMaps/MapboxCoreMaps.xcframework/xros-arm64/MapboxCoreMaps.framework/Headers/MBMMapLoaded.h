// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMEventTimeInterval;

/**
 * The style has been fully loaded, and the `map` has rendered all visible tiles.
 * The event will be emitted only once for the current style. If it is required to
 * observe an event where all required resources are loaded or rendered, please
 * check the following events: `MapIdle`, `StyleDataLoaded`, and `RenderFrameFinished`.
 */
NS_SWIFT_NAME(MapLoaded)
__attribute__((visibility ("default")))
@interface MBMMapLoaded : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTimeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/**
 * The `timeInterval.begin` represents the time when a style is set, and the
 * `timeInterval.end` is taken when the `map` is fully loaded.
 */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
