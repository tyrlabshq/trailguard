// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * The `map` has entered the idle state. The `map` is idle when there are no ongoing
 * animations, transitions and the `map` has rendered all requested non-volatile tiles
 * (e.g., live traffic tiles). The event will not be emitted if `setUserAnimationInProgress`
 * and / or `setGestureInProgress` is set to `true`.
 *
 * The `MapIdle` will also be emitted after expired resources are re-fetched and `map` re-renders the new data.
 */
NS_SWIFT_NAME(MapIdle)
__attribute__((visibility ("default")))
@interface MBMMapIdle : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTimestamp:(nonnull NSDate *)timestamp;

/** The timestamp of the `MapIdle` event. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
