// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMCustomRasterSourceTileStatus.h>

@class MBMCanonicalTileID;

/**
 * Callback for changing a CustomRasterSource tile status.
 *
 * @param tileId A `canonical tile id` of the tile.
 * @param status A new status of the tile.
 */
NS_SWIFT_NAME(CustomRasterSourceTileStatusChangedCallback)
typedef void (^MBMCustomRasterSourceTileStatusChangedCallback)(MBMCanonicalTileID * _Nonnull tileId, MBMCustomRasterSourceTileStatus status); // NOLINT(modernize-use-using)
