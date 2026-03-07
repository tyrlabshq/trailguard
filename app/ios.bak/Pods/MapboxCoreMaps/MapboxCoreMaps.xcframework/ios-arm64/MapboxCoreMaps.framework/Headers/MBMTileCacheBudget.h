// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMTileCacheBudgetInMegabytes;
@class MBMTileCacheBudgetInTiles;
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMTileCacheBudgetType)
{
    MBMTileCacheBudgetTypeTileCacheBudgetInMegabytes,
    MBMTileCacheBudgetTypeTileCacheBudgetInTiles
} NS_SWIFT_NAME(TileCacheBudgetType);

NS_SWIFT_NAME(TileCacheBudget)
__attribute__((visibility ("default")))
@interface MBMTileCacheBudget : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromTileCacheBudgetInMegabytes:(nonnull MBMTileCacheBudgetInMegabytes *)value;
+ (nonnull instancetype)fromTileCacheBudgetInTiles:(nonnull MBMTileCacheBudgetInTiles *)value;

- (BOOL)isTileCacheBudgetInMegabytes;
- (BOOL)isTileCacheBudgetInTiles;

- (nonnull MBMTileCacheBudgetInMegabytes *)getTileCacheBudgetInMegabytes __attribute((ns_returns_retained));
- (nonnull MBMTileCacheBudgetInTiles *)getTileCacheBudgetInTiles __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBMTileCacheBudgetType type;

@end
