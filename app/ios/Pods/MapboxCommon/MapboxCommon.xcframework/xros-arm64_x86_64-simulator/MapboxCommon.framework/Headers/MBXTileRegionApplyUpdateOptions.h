// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXNetworkRestriction.h>

/** Describes the tile region load option values. */
NS_SWIFT_NAME(TileRegionApplyUpdateOptions)
__attribute__((visibility ("default")))
@interface MBXTileRegionApplyUpdateOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithExtraOptions:(nullable id)extraOptions NS_REFINED_FOR_SWIFT;

- (nonnull instancetype)initWithNetworkRestriction:(MBXNetworkRestriction)networkRestriction
                                      extraOptions:(nullable id)extraOptions NS_REFINED_FOR_SWIFT;

/**
 * Controls which networks may be used to fix update application issues.
 *
 * On normal conditions, applying an update should not require network usage. However, if the update cannot be
 * completely applied due to missing or incomplete data, this option specify which networks can be used to fetch
 * the missing resources. By default, only non-metered networks are allowed.
 */
@property (nonatomic, readonly) MBXNetworkRestriction networkRestriction;

/** Reserved for future use. */
@property (nonatomic, readonly, nullable, copy) id extraOptions;


@end
