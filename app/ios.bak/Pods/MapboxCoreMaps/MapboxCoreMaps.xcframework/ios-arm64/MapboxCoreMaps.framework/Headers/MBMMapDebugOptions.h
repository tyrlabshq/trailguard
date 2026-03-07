// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Options for enabling debugging features in a map. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMMapDebugOptions)
{
    /**
     * Edges of tile boundaries are shown as thick, red lines to help diagnose
     * tile clipping issues.
     */
    MBMMapDebugOptionsTileBorders,
    /** Each tile shows its tile coordinate (x/y/z) in the upper-left corner. */
    MBMMapDebugOptionsParseStatus,
    /**
     * Each tile shows a timestamps with modified and expires dates or n/a if
     * timestamp is not available.
     */
    MBMMapDebugOptionsTimestamps,
    /**
     * Edges of glyphs and symbols are shown as faint, green lines to help
     * diagnose collision and label placement issues.
     */
    MBMMapDebugOptionsCollision,
    /**
     * Each drawing operation is replaced by a translucent fill. Overlapping
     * drawing operations appear more prominent to help diagnose overdrawing.
     */
    MBMMapDebugOptionsOverdraw,
    /** The stencil buffer is shown instead of the color buffer. */
    MBMMapDebugOptionsStencilClip,
    /** The depth buffer is shown instead of the color buffer. */
    MBMMapDebugOptionsDepthBuffer,
    /** Show 3D model bounding boxes. */
    MBMMapDebugOptionsModelBounds,
    /** Show a wireframe for terrain. Currently supported for GL backend only. */
    MBMMapDebugOptionsTerrainWireframe,
    /** Show a wireframe for 2d layers. Currently supported for GL backend only. */
    MBMMapDebugOptionsLayers2DWireframe,
    /** Show a wireframe for 3d layers. Currently supported for GL backend only. */
    MBMMapDebugOptionsLayers3DWireframe,
    /** Each tile shows its local lighting conditions in the upper-left corner. (If `lights` properties are used, otherwise they show zero.) */
    MBMMapDebugOptionsLight
} NS_SWIFT_NAME(MapDebugOptions);
