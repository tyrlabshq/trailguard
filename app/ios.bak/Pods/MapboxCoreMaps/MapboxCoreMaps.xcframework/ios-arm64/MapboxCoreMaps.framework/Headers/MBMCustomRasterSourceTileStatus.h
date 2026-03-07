// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** CustomRasterSource tile status. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMCustomRasterSourceTileStatus)
{
    /**
     * Tile best suited for current camera position.
     * Should be loaded if possible.
     */
    MBMCustomRasterSourceTileStatusRequired,
    /**
     * Tile can be used if required tile is missing.
     * Can be provided if already present in a cache.
     */
    MBMCustomRasterSourceTileStatusOptional,
    /** Tile is not visible and no more needed. */
    MBMCustomRasterSourceTileStatusNotNeeded
} NS_SWIFT_NAME(CustomRasterSourceTileStatus);
