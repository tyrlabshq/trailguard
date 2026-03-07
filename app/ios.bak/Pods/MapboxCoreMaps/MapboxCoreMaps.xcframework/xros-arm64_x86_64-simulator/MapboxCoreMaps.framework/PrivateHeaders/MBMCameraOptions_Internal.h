// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>
@class MBXCoordinate2D;

@class MBMEdgeInsets;
@class MBMScreenCoordinate;

NS_SWIFT_NAME(CameraOptions)
__attribute__((visibility ("default")))
@interface MBMCameraOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithCenter:(nullable MBXCoordinate2D *)center
                               padding:(nullable MBMEdgeInsets *)padding
                                anchor:(nullable MBMScreenCoordinate *)anchor
                                  zoom:(nullable NSNumber *)zoom
                               bearing:(nullable NSNumber *)bearing
                                 pitch:(nullable NSNumber *)pitch NS_REFINED_FOR_SWIFT;

/** Coordinate at the center of the camera. */
@property (nonatomic, readonly, nullable) MBXCoordinate2D *center NS_REFINED_FOR_SWIFT;

@property (nonatomic, readonly, nullable) MBMEdgeInsets *padding NS_REFINED_FOR_SWIFT;
@property (nonatomic, readonly, nullable) MBMScreenCoordinate *anchor NS_REFINED_FOR_SWIFT;
/**
 * Zero-based zoom level. Constrained to the minimum and maximum zoom
 * levels.
 */
@property (nonatomic, readonly, nullable) NSNumber *zoom NS_REFINED_FOR_SWIFT;

/** Bearing, measured in degrees from true north. Wrapped to [0, 360). */
@property (nonatomic, readonly, nullable) NSNumber *bearing NS_REFINED_FOR_SWIFT;

/** Pitch toward the horizon measured in degrees. */
@property (nonatomic, readonly, nullable) NSNumber *pitch NS_REFINED_FOR_SWIFT;


@end
