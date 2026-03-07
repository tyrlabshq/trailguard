// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCanonicalTileID;
@class MBMImage;

/** Data for a specific CustomRasterSource tile. */
NS_SWIFT_NAME(CustomRasterSourceTileData)
__attribute__((visibility ("default")))
@interface MBMCustomRasterSourceTileData : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** A `canonical tile id` of the tile. */
@property (nonatomic, readonly, nonnull) MBMCanonicalTileID *tileId;


@end
