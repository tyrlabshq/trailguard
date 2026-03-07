// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

@class MBMImage;
@class MBMScreenCoordinate;

NS_SWIFT_NAME(MapSnapshot)
__attribute__((visibility ("default")))
@interface MBMMapSnapshot : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull MBMScreenCoordinate *)screenCoordinateForCoordinate:(CLLocationCoordinate2D)coordinate __attribute((ns_returns_retained));
- (CLLocationCoordinate2D)coordinateForScreenCoordinate:(nonnull MBMScreenCoordinate *)screenCoordinate;
/**
 * Get list of attributions for the sources in this snapshot.
 *
 * @return A list of attributions for the sources in this snapshot.
 */
- (nonnull NSArray<NSString *> *)attributions __attribute((ns_returns_retained));
- (nullable MBMImage *)moveImage __attribute((ns_returns_retained));

@end
