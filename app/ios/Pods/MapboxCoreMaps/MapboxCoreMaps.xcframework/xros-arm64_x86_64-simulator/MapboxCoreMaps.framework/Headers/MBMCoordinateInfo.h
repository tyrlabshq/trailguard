// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

/** Represents the coordinate information returned by the `coordinateInfoForPixel` or `coordinatesInfoForPixels` methods. */
NS_SWIFT_NAME(CoordinateInfo)
__attribute__((visibility ("default")))
@interface MBMCoordinateInfo : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithCoordinate:(CLLocationCoordinate2D)coordinate
                               isOnSurface:(BOOL)isOnSurface;

/**
 * The geographical coordinate corresponding to the given screen coordinate.
 * This will be the closest position projected onto the map surface,
 * in case the screen coordinate does not intersect with the map surface.
 */
@property (nonatomic, readonly) CLLocationCoordinate2D coordinate;

/** A flag indicating whether the screen coordinate is on the map surface or not. */
@property (nonatomic, readonly) BOOL isOnSurface;


@end
