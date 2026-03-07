// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Tile cache budget in megabytes. */
NS_SWIFT_NAME(TileCacheBudgetInMegabytes)
__attribute__((visibility ("default")))
@interface MBMTileCacheBudgetInMegabytes : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSize:(uint64_t)size;

@property (nonatomic, readonly) uint64_t size;

- (BOOL)isEqualToTileCacheBudgetInMegabytes:(nonnull MBMTileCacheBudgetInMegabytes *)other;

@end
