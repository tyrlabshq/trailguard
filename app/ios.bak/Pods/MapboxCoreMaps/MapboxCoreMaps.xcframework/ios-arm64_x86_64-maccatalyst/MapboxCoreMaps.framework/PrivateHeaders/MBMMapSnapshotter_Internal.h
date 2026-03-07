// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>
#import <MapboxCoreMaps/MBMSnapshotCompleteCallback_Internal.h>
#import <MapboxCoreMaps/MBMCameraManager_Internal.h>

@class MBMMapSnapshotOptions;
@class MBMSize;

NS_SWIFT_NAME(MapSnapshotter)
__attribute__((visibility ("default")))
@interface MBMMapSnapshotter : MBMCameraManager

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithOptions:(nonnull MBMMapSnapshotOptions *)options;

/**
 * Sets the `size` of the snapshot
 *
 * @param size The new `size` of the snapshot in `platform pixels`.
 */
- (void)setSizeForSize:(nonnull MBMSize *)size;
/**
 * Gets the size of the snapshot
 *
 * @return Snapshot `size` in `platform pixels`.
 */
- (nonnull MBMSize *)getSize __attribute((ns_returns_retained));
- (void)startForCallback:(nonnull MBMSnapshotCompleteCallback)callback;
/**
 * Cancel the current snapshot operation.
 *
 * Cancel the current snapshot operation, if any. The callback passed to the start method
 * is called with error parameter set.
 */
- (void)cancel;
/**
 * Get elevation for the given coordinate.
 * Note: Elevation is only available for the visible region on the screen.
 *
 * @param coordinate defined as longitude-latitude pair.
 *
 * @return Elevation (in meters) multiplied by current terrain exaggeration, or empty if elevation for the coordinate is not available.
 */
- (nullable NSNumber *)getElevationForCoordinate:(CLLocationCoordinate2D)coordinate __attribute((ns_returns_retained));
- (void)reduceMemoryUse;

@end
