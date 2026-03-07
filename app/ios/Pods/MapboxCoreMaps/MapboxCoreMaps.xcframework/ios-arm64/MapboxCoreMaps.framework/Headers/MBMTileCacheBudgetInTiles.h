// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Tile cache budget in tiles. */
NS_SWIFT_NAME(TileCacheBudgetInTiles)
__attribute__((visibility ("default")))
@interface MBMTileCacheBudgetInTiles : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSize:(uint64_t)size;

@property (nonatomic, readonly) uint64_t size;

- (BOOL)isEqualToTileCacheBudgetInTiles:(nonnull MBMTileCacheBudgetInTiles *)other;

@end
