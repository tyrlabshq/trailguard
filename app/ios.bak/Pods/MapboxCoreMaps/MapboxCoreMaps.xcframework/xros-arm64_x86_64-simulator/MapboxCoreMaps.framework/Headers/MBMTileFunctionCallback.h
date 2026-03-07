// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCanonicalTileID;

/**
 * Callback to do various operations for tile.
 * For example, fetching a tile or cancelling a tile request.
 *
 * @param tileId A `canonical tile id` of the tile.
 */
NS_SWIFT_NAME(TileFunctionCallback)
typedef void (^MBMTileFunctionCallback)(MBMCanonicalTileID * _Nonnull tileId); // NOLINT(modernize-use-using)
