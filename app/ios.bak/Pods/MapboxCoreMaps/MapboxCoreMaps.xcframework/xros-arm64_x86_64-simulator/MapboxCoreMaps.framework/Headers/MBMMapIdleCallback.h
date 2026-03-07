// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMMapIdle;

/**
 * The `map` has entered the idle state. The `map` is idle when there are no ongoing
 * animations, transitions and the `map` has rendered all requested non-volatile tiles
 * (e.g., live traffic tiles). The event will not be emitted if `setUserAnimationInProgress`
 * and / or `setGestureInProgress` is set to `true`.
 *
 * The `MapIdle` will also be emitted after expired resources are re-fetched and `map` re-renders the new data.
 *
 * @see MapIdle
 */
NS_SWIFT_NAME(MapIdleCallback)
typedef void (^MBMMapIdleCallback)(MBMMapIdle * _Nonnull mapIdle); // NOLINT(modernize-use-using)
