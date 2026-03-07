// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMCustomRasterSourceTileStatus.h>

@class MBMCanonicalTileID;
@class MBMCustomLayerRenderParameters;

/**
 * Interface for the direct rendering into the custom raster tiles.
 *
 * The client should implement this interface for the direct rendering into the custom raster tiles.
 * The layers that use the corresponding custom raster source will have the rendered content as the input tile data.
 * All methods of this interface are invoked from the renderer thread.
 */
NS_SWIFT_NAME(CustomRasterSourceTileRenderer)
@protocol MBMCustomRasterSourceTileRenderer
/**
 * Initialize any Metal state needed by the tile renderer. This method is called once,
 * before rendering for the first time.
 * The client should obtain the `MTLDevice` instance from the `device` argument, using the
 * following code:
 * ```
 * metalDevice = (__bridge id<MTLDevice>)(void*)device;
 * ```
 *
 * @param device the pointer to MTLDevice.
 * @param colorPixelFormat the current color pixel format
 */
- (void)initializeForDevice:(uint64_t)device
           colorPixelFormat:(uint64_t)colorPixelFormat;
/**
 * Checks whether the tile should be rendered in the current frame.
 *
 * This method is called once for each tile in every frame, from the renderer thread, before rendering.
 *
 * @param tileId Tile ID of the target tile that we are rendering to.
 * @param status the status of the tile.
 * @return `true` if the tile is renderable in the current frame; `false` otherwise.
 */
- (BOOL)isTileRenderableForTileID:(nonnull MBMCanonicalTileID *)tileID
                           status:(MBMCustomRasterSourceTileStatus)status;
/**
 * This method is called once per frame, before any layer is rendered.
 * It is to be used to allow to prepare resources or render into a texture for the client
 * or initialize some varaibles and states shared across the tiles.
 *
 * The client should obtain the `MTLCommandBuffer` instance from the `commandBuffer` argument, using the
 * following code:
 * ```
 * mtlCommandBuffer = (__bridge id<MTLCommandBuffer>)(void*)commandBuffer;
 * ```
 *
 * @param parameters The `custom layer render parameters`.
 * @param commandBuffer the default command buffer
 */
- (void)prerenderForParameters:(nonnull MBMCustomLayerRenderParameters *)parameters
                 commandBuffer:(uint64_t)commandBuffer;
/**
 * Orthographic mode render to the tile. This method is called once for each tile
 * in every frame.
 * This method is called only if client code returns `true` from the corresponding isTileRenderable() method.
 * Implementation should not change target framebuffer (as the render target is the tile texture).
 * The reason is performance hit that would stem from such practice. If there's a need for switching
 * rendering targets, implementation should use prerender() method.
 *
 * The client should obtain the `MTLRenderCommandEncoder` instance from the `commandEncoder` argument, using the
 * following code:
 * ```
 * mtlCommandEncoder = (__bridge id<MTLRenderCommandEncoder>)(void*)commandEncoder;
 * ```
 *
 * @param tileId Tile ID of the target tile that we are rendering to.
 * @param commandEncoder the command encoder for the tile texture render pass
 */
- (void)renderToTileForTileID:(nonnull MBMCanonicalTileID *)tileID
               commandEncoder:(uint64_t)commandEncoder;
/**
 * Destroy any GL state needed by the custom renderer, and deallocate context, if necessary. This
 * method is called once, at a point when the GL context is active.
 *
 * Note that it may be called even when the `initialize` function has not been called.
 */
- (void)deinitialize;
@end
