// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>
@class MBXCoordinate2D;
@class MBXExpected<__covariant Value, __covariant Error>;
@class MBXGeometry;
#import <MapboxCoreMaps/MBMStyleManager_Internal.h>

@class MBMCameraBounds;
@class MBMCameraBoundsOptions;
@class MBMCameraOptions;
@class MBMCameraState;
@class MBMCanonicalTileID;
@class MBMCoordinateBounds;
@class MBMCoordinateBoundsZoom;
@class MBMCoordinateInfo;
@class MBMEdgeInsets;
@class MBMFreeCameraOptions;
@class MBMScreenBox;
@class MBMScreenCoordinate;
@class MBMTileCoverOptions;

NS_SWIFT_NAME(CameraManager)
__attribute__((visibility ("default")))
@interface MBMCameraManager : MBMStyleManager

- (nonnull MBMCameraOptions *)cameraForCoordinateBoundsForBounds:(nonnull MBMCoordinateBounds *)bounds
                                                         padding:(nullable MBMEdgeInsets *)padding
                                                         bearing:(nullable NSNumber *)bearing
                                                           pitch:(nullable NSNumber *)pitch
                                                         maxZoom:(nullable NSNumber *)maxZoom
                                                          offset:(nullable MBMScreenCoordinate *)offset __attribute((ns_returns_retained)) __attribute__((deprecated("Please use: '-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:' instead.", "-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:")));
- (nonnull MBMCameraOptions *)cameraForCoordinatesForCoordinates:(nonnull NSArray<MBXCoordinate2D *> *)coordinates
                                                         padding:(nullable MBMEdgeInsets *)padding
                                                         bearing:(nullable NSNumber *)bearing
                                                           pitch:(nullable NSNumber *)pitch __attribute((ns_returns_retained)) __attribute__((deprecated("Please use: '-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:' instead.", "-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:")));
- (nonnull MBXExpected<MBMCameraOptions *, NSString *> *)cameraForCoordinatesForCoordinates:(nonnull NSArray<MBXCoordinate2D *> *)coordinates
                                                                                     camera:(nullable MBMCameraOptions *)camera
                                                                         coordinatesPadding:(nullable MBMEdgeInsets *)coordinatesPadding
                                                                                    maxZoom:(nullable NSNumber *)maxZoom
                                                                                     offset:(nullable MBMScreenCoordinate *)offset __attribute((ns_returns_retained));
- (nonnull MBMCameraOptions *)cameraForCoordinatesForCoordinates:(nonnull NSArray<MBXCoordinate2D *> *)coordinates
                                                          camera:(nonnull MBMCameraOptions *)camera
                                                             box:(nonnull MBMScreenBox *)box __attribute((ns_returns_retained));
- (nonnull MBMCameraOptions *)cameraForGeometryForGeometry:(nonnull MBXGeometry *)geometry
                                                   padding:(nullable MBMEdgeInsets *)padding
                                                   bearing:(nullable NSNumber *)bearing
                                                     pitch:(nullable NSNumber *)pitch __attribute((ns_returns_retained)) __attribute__((deprecated("Please use: '-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:' instead.", "-cameraForCoordinatesForCoordinates:camera:coordinatesPadding:maxZoom:offset:")));
- (nonnull MBMCoordinateBounds *)coordinateBoundsForCameraForCamera:(nonnull MBMCameraOptions *)camera __attribute((ns_returns_retained));
- (nonnull MBMCoordinateBounds *)coordinateBoundsForCameraUnwrappedForCamera:(nonnull MBMCameraOptions *)camera __attribute((ns_returns_retained));
- (nonnull MBMCoordinateBoundsZoom *)coordinateBoundsZoomForCameraForCamera:(nonnull MBMCameraOptions *)camera __attribute((ns_returns_retained));
- (nonnull MBMCoordinateBoundsZoom *)coordinateBoundsZoomForCameraUnwrappedForCamera:(nonnull MBMCameraOptions *)camera __attribute((ns_returns_retained));
- (nonnull MBMScreenCoordinate *)pixelForCoordinateForCoordinate:(CLLocationCoordinate2D)coordinate __attribute((ns_returns_retained));
- (CLLocationCoordinate2D)coordinateForPixelForPixel:(nonnull MBMScreenCoordinate *)pixel;
- (nonnull MBMCoordinateInfo *)coordinateInfoForPixelForPixel:(nonnull MBMScreenCoordinate *)pixel __attribute((ns_returns_retained));
- (nonnull NSArray<MBMScreenCoordinate *> *)pixelsForCoordinatesForCoordinates:(nonnull NSArray<MBXCoordinate2D *> *)coordinates __attribute((ns_returns_retained));
- (nonnull NSArray<MBXCoordinate2D *> *)coordinatesForPixelsForPixels:(nonnull NSArray<MBMScreenCoordinate *> *)pixels __attribute((ns_returns_retained));
- (nonnull NSArray<MBMCoordinateInfo *> *)coordinatesInfoForPixelsForPixels:(nonnull NSArray<MBMScreenCoordinate *> *)pixels __attribute((ns_returns_retained));
- (void)setCameraForCameraOptions:(nonnull MBMCameraOptions *)cameraOptions;
- (nonnull MBMCameraState *)getCameraState __attribute((ns_returns_retained));
/**
 * Sets the map view with the free camera options.
 *
 * The `free camera options` provides more direct access to the underlying camera entity.
 * For backwards compatibility the state set using this API must be representable with
 * `camera options` as well. Parameters are clamped to a valid range or discarded as invalid
 * if the conversion to the pitch and bearing presentation is ambiguous. For example orientation
 * can be invalid if it leads to the camera being upside down or the quaternion has zero length.
 *
 * @param freeCameraOptions The `free camera options` to set.
 */
- (void)setCameraForFreeCameraOptions:(nonnull MBMFreeCameraOptions *)freeCameraOptions;
/**
 * Gets the map's current free camera options. After mutation, it should be set back to the map.
 *
 * @return The current `free camera options`.
 */
- (nonnull MBMFreeCameraOptions *)getFreeCameraOptions __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setBoundsForOptions:(nonnull MBMCameraBoundsOptions *)options __attribute((ns_returns_retained));
- (nonnull MBMCameraBounds *)getBounds __attribute((ns_returns_retained));
/**
 * Sets whether multiple copies of the world will be rendered side by side beyond -180 and 180 degrees longitude.
 * If disabled, when the map is zoomed out far enough that a single representation of the world does not fill the map's entire
 * container, there will be blank space beyond 180 and -180 degrees longitude.
 * In this case, features that cross 180 and -180 degrees longitude will be cut in two (with one portion on the right edge of the
 * map and the other on the left edge of the map) at every zoom level.
 * By default, By renderWorldCopies is set to `true`.
 *
 * @param renderWorldCopies The `boolean` value defining whether rendering world copies is going to be enabled or not.
 */
- (void)setRenderWorldCopiesForRenderWorldCopies:(BOOL)renderWorldCopies;
/**
 * Returns whether multiple copies of the world are being rendered side by side beyond -180 and 180 degrees longitude.
 * @return `true` if rendering world copies is enabled, `false` otherwise.
 */
- (BOOL)getRenderWorldCopies;
- (nonnull MBMCameraOptions *)cameraForDragForStartCoordinate:(nonnull MBMScreenCoordinate *)startCoordinate
                                                endCoordinate:(nonnull MBMScreenCoordinate *)endCoordinate __attribute((ns_returns_retained));
- (nonnull NSArray<MBMCanonicalTileID *> *)tileCoverForTileCoverOptions:(nonnull MBMTileCoverOptions *)tileCoverOptions
                                                          cameraOptions:(nullable MBMCameraOptions *)cameraOptions __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (BOOL)isPixelAboveHorizonForPixel:(nonnull MBMScreenCoordinate *)pixel;

@end
