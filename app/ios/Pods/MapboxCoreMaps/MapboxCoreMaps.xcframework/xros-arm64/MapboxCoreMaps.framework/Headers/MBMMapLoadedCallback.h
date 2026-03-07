// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMMapLoaded;

/**
 * The style has been fully loaded, and the `map` has rendered all visible tiles.
 * The event will be emitted only once for the current style. If it is required to
 * continuously observe an event where all the necessary resources are loaded or rendered,
 * please check the following events: `MapIdle`, `StyleDataLoaded`, and `RenderFrameFinished`.
 *
 * @see MapLoaded
 */
NS_SWIFT_NAME(MapLoadedCallback)
typedef void (^MBMMapLoadedCallback)(MBMMapLoaded * _Nonnull mapLoaded); // NOLINT(modernize-use-using)
