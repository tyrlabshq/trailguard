// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCustomRasterSourceClient;

/** Options for custom raster source. */
NS_SWIFT_NAME(CustomRasterSourceOptions)
__attribute__((visibility ("default")))
@interface MBMCustomRasterSourceOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithClientCallback:(nonnull MBMCustomRasterSourceClient *)clientCallback;

- (nonnull instancetype)initWithClientCallback:(nonnull MBMCustomRasterSourceClient *)clientCallback
                                       minZoom:(uint8_t)minZoom
                                       maxZoom:(uint8_t)maxZoom
                                      tileSize:(uint16_t)tileSize;

/**
 * The client callback.
 *
 * Custom raster sourtce can be configured for either direct or asynchronous rendering:
 * When `CustomRasterSourceTileStatusChangedCallback` instance is provided, rendering is asynchronous, and
 * the client should use setStyleCustomRasterSourceTileData() API to provide the tile data.
 *
 * When `CustomRasterSourceTileRenderer` instance is provided, rendering is direct, and the client should
 * render to the tile from within the `CustomRasterSourceTileRenderer.renderToTile()` method.
 */
@property (nonatomic, readonly, nonnull) MBMCustomRasterSourceClient *clientCallback;

/**
 * A minimum zoom level, at which to create vector tiles.
 *
 * The default value is `0`.
 */
@property (nonatomic, readonly) uint8_t minZoom;

/**
 * A maximum zoom level, at which to create vector tiles.
 *
 * A higher maximum zoom level provides greater details at high map zoom levels.
 *
 * The default value is `18`.
 */
@property (nonatomic, readonly) uint8_t maxZoom;

/** Size of the tiles. Tile size must be a power of 2. Default is `512`. */
@property (nonatomic, readonly) uint16_t tileSize;


@end
