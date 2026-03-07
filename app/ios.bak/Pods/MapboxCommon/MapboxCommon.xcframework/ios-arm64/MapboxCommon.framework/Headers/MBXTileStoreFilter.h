// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXTileDataDomain.h>

/**
 * A filter class that can be used to specify a subset tiles and resources in a request to the TileStore.
 *
 * The filter is made by chaining calls to the various filtering methods. The filter can then be passed to
 * TileStore methods that accept a filter.
 *
 * Note: resources can only be filtered using `byDomain()`, `byTileRegion()` and `excludeTileRegions()`. Other
 * functions have no effect on resource filtering.
 */
NS_SWIFT_NAME(TileStoreFilter)
__attribute__((visibility ("default")))
@interface MBXTileStoreFilter : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

/** Creates a TileStoreFilter instance without any applied filters. */
+ (nonnull MBXTileStoreFilter *)make __attribute((ns_returns_retained));
/**
 * Filter by the data domain the resource is referring to. If not set, all domains are included, otherwise only
 * tiles and resources matching the given domain are included. Any number of `byDomain()` calls can be made to
 * include multiple domains.
 */
- (nonnull MBXTileStoreFilter *)byDomainForDomain:(MBXTileDataDomain)domain __attribute((ns_returns_retained));
/**
 * Filter by the dataset the tile is referring to. If not set, all datasets are included, otherwise only tiles
 * matching the given dataset are included. Any number of `byTileDataset()` calls can be made to include
 * multiple datasets.
 */
- (nonnull MBXTileStoreFilter *)byTileDatasetForDataset:(nonnull NSString *)dataset __attribute((ns_returns_retained));
/**
 * Filter by the version of the tile. If not set, all versions are included, otherwise only tiles matching the given
 * version are included. Any number of `byTileVersion()` calls can be made to include multiple versions.
 */
- (nonnull MBXTileStoreFilter *)byTileVersionForVersion:(nonnull NSString *)version __attribute((ns_returns_retained));
/**
 * Filter by tile region. If not set, all tiles and resources from all tile regions are included (and those not
 * in any region), otherwise only tiles and resources matching the given region are included. Any number
 * of `byTileRegion()` calls can be made to include multiple regions.
 */
- (nonnull MBXTileStoreFilter *)byTileRegionForId:(nonnull NSString *)id_ __attribute((ns_returns_retained));
/**
 * Filter by style pack. If not set, all style packs are included, otherwise only those style packs matching the
 * given id are included. Any number of `byStylePack()` calls can be made to include multiple style packs.
 */
- (nonnull MBXTileStoreFilter *)byStylePackForId:(nonnull NSString *)id_ __attribute((ns_returns_retained));
/** Exclude resources from the result set. */
- (nonnull MBXTileStoreFilter *)excludeResources __attribute((ns_returns_retained));
/** Exclude tiles from the result set. */
- (nonnull MBXTileStoreFilter *)excludeTiles __attribute((ns_returns_retained));

@end
