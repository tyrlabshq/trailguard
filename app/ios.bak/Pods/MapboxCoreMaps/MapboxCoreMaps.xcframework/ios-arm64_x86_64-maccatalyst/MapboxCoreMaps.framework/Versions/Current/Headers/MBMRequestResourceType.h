// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the type of resource requested by the `map`. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRequestResourceType)
{
    /** The resource type is unknown. */
    MBMRequestResourceTypeUnknown,
    /** The resource type is a style document. */
    MBMRequestResourceTypeStyle,
    /** The resource type is a source document, for example, TileJSON. */
    MBMRequestResourceTypeSource,
    /** The resource type is a tile, for example, a vector or raster tile. */
    MBMRequestResourceTypeTile,
    /** The resource type is glyphs used to render text on the map. */
    MBMRequestResourceTypeGlyphs,
    /**
     * The resource type is a sprite image used together with the sprite JSON
     * definition to create a sprite sheet.
     */
    MBMRequestResourceTypeSpriteImage,
    /** The resource type is a sprite JSON metadata used to create a sprite sheet. */
    MBMRequestResourceTypeSpriteJSON,
    /** The resource type is an image, for example, image rendered by the `image` style source. */
    MBMRequestResourceTypeImage,
    /** The resource type is a 3D model. */
    MBMRequestResourceTypeModel
} NS_SWIFT_NAME(RequestResourceType);

NSString* MBMRequestResourceTypeToString(MBMRequestResourceType request_resource_type);
