// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMAsyncOperationResultCallback_Internal.h>
#import <MapboxCoreMaps/MBMTileStoreUsageMode.h>

@class MBXTileStore;

NS_SWIFT_NAME(MapsResourceOptions)
__attribute__((visibility ("default")))
@interface MBMMapsResourceOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

/**
 * Set the base URL that would be used by the Maps engine to make HTTP requests.
 * The value of the key must be a string that is a valid URL.
 *
 * By default the engine uses the base URL `https://api.mapbox.com`
 *
 * @param baseURL base URL
 */
+ (void)setBaseURLForBaseURL:(nonnull NSString *)baseURL NS_REFINED_FOR_SWIFT;
/**
 * Get the base URL resource option
 *
 * @return base URL
 */
+ (nonnull NSString *)getBaseURL __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
/**
 * Set the path to the Maps data folder.
 *
 * The engine will use this folder for storing offline style packages and temporary data.
 *
 * The application must have sufficient permissions to create files within the provided directory.
 * If a DataPath is not provided, the default location will be used.
 *
 * @param dataPath data path
 */
+ (void)setDataPathForDataPath:(nonnull NSString *)dataPath NS_REFINED_FOR_SWIFT;
/**
 * Get the data path resource option
 *
 * @return data path
 */
+ (nonnull NSString *)getDataPath __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
/**
 * Set the path to the Maps asset folder.
 *
 * The path to the folder where application assets are located. Resources whose protocol is `asset://`
 * will be fetched from an asset folder or asset management system provided by respective platform.
 * This option is ignored for Android platform. An iOS application may provide path to an application bundle's path.
 *
 * @param assetPath asset path
 */
+ (void)setAssetPathForAssetPath:(nonnull NSString *)assetPath NS_REFINED_FOR_SWIFT;
/**
 * Get the asset path resource option
 *
 * @return asset path
 */
+ (nonnull NSString *)getAssetPath __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
/**
 * Set the tile store usage mode for the Maps API objects.
 *
 * The `ReadOnly` mode is used by default.
 *
 * @param tileStoreUsageMode tile store usage mode
 */
+ (void)setTileStoreUsageModeForTileStoreUsageMode:(MBMTileStoreUsageMode)tileStoreUsageMode NS_REFINED_FOR_SWIFT;
/**
 * Get tile store usage mode
 *
 * @return tile store usage mode
 */
+ (MBMTileStoreUsageMode)getTileStoreUsageMode NS_REFINED_FOR_SWIFT;
/**
 * Set the tile store instance for the Maps API objects.
 *
 * This resource option is taken into consideration by the Maps API objects only if tile store usage is enabled.
 *
 * If null is set, but tile store usage is enabled, a tile store at the default location will be created and used.
 */
+ (void)setTileStoreForTileStore:(nullable MBXTileStore *)tileStore NS_REFINED_FOR_SWIFT;
/**
 * Get tile store instance
 *
 * @return tile store or null if store usage is not enabled
 */
+ (nullable MBXTileStore *)getTileStore __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
+ (void)clearDataForCallback:(nonnull MBMAsyncOperationResultCallback)callback NS_REFINED_FOR_SWIFT;

@end
