// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>
#import <MapboxCoreMaps/MBMConstrainMode.h>
#import <MapboxCoreMaps/MBMFeatureStateOperationCallback_Internal.h>
#import <MapboxCoreMaps/MBMMapCenterAltitudeMode.h>
#import <MapboxCoreMaps/MBMMapDebugOptions.h>
#import <MapboxCoreMaps/MBMNorthOrientation.h>
#import <MapboxCoreMaps/MBMPerformanceStatisticsCallback.h>
#import <MapboxCoreMaps/MBMQueryFeatureExtensionCallback_Internal.h>
#import <MapboxCoreMaps/MBMQueryFeatureStateCallback_Internal.h>
#import <MapboxCoreMaps/MBMQueryRenderedFeaturesCallback_Internal.h>
#import <MapboxCoreMaps/MBMQuerySourceFeaturesCallback_Internal.h>
#import <MapboxCoreMaps/MBMViewportMode.h>
@class MBXExpected<__covariant Value, __covariant Error>;
@class MBXFeature;
#import <MapboxCoreMaps/MBMCameraManager_Internal.h>

@class MBMCameraAnimationHint;
@class MBMFeaturesetDescriptor;
@class MBMFeaturesetFeatureId;
@class MBMFeaturesetQueryTarget;
@class MBMInteraction;
@class MBMMapOptions;
@class MBMPerformanceStatisticsOptions;
@class MBMPlatformEventInfo;
@class MBMRenderedQueryGeometry;
@class MBMRenderedQueryOptions;
@class MBMSize;
@class MBMSourceQueryOptions;
@class MBMTileCacheBudget;
@class MBMVec2;
@class MBMViewAnnotationOptions;
@protocol MBMMapClient;
@protocol MBMViewAnnotationPositionsUpdateListener;
@protocol MBXCancelable;

NS_SWIFT_NAME(Map)
__attribute__((visibility ("default")))
@interface MBMMap : MBMCameraManager

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithClient:(nonnull id<MBMMapClient>)client
                            mapOptions:(nonnull MBMMapOptions *)mapOptions;

/**
 * Creates the infrastructure needed for rendering the map.
 * It should be called before any call to `render` method. Must be called on the render thread.
 */
- (void)createRenderer;
/**
 * Destroys the infrastructure needed for rendering the map, releasing resources.
 * Must be called on the render thread.
 */
- (void)destroyRenderer;
/** Renders the map. */
- (void)render;
/**
 * Sets the size of the map.
 * @param size The new `size` of the map in `platform pixels`.
 */
- (void)setSizeForSize:(nonnull MBMSize *)size;
/**
 * Gets the size of the map.
 *
 * @return The `size` of the map in `platform pixels`.
 */
- (nonnull MBMSize *)getSize __attribute((ns_returns_retained));
/** Triggers a repaint of the map. */
- (void)triggerRepaint;
/**
 * Tells the map rendering engine that there is currently a gesture in progress. This
 * affects how the map renders labels, as it will use different texture filters if a gesture
 * is ongoing.
 *
 * @param inProgress The `boolean` value representing if a gesture is in progress.
 */
- (void)setGestureInProgressForInProgress:(BOOL)inProgress;
/**
 * Returns `true` if a gesture is currently in progress.
 *
 * @return `true` if a gesture is currently in progress, `false` otherwise.
 */
- (BOOL)isGestureInProgress;
/**
 * Tells the map rendering engine that the animation is currently performed by the
 * user (e.g. with a `setCamera` calls series). It adjusts the engine for the animation use case.
 * In particular, it brings more stability to symbol placement and rendering.
 *
 * @param inProgress The `boolean` value representing if user animation is in progress
 */
- (void)setUserAnimationInProgressForInProgress:(BOOL)inProgress;
- (void)setCameraAnimationHintForCameraAnimationHint:(nonnull MBMCameraAnimationHint *)cameraAnimationHint;
/**
 * Returns `true` if user animation is currently in progress.
 *
 * @return `true` if a user animation is currently in progress, `false` otherwise.
 */
- (BOOL)isUserAnimationInProgress;
/**
 * When loading a map, if prefetch zoom `delta` is set to any number greater than 0,
 * the map will first request a tile at zoom level lower than `zoom - delta`, with requested
 * zoom level a multiple of `delta`, in an attempt to display a full map at lower resolution as quick as possible.
 *
 * @param delta The new prefetch zoom delta.
 */
- (void)setPrefetchZoomDeltaForDelta:(uint8_t)delta;
/**
 * Returns the map's prefetch zoom delta.
 *
 * @return The map's prefetch zoom `delta`.
 */
- (uint8_t)getPrefetchZoomDelta;
/** Sets the north `orientation mode`. */
- (void)setNorthOrientationForOrientation:(MBMNorthOrientation)orientation;
/** Sets the map `constrain mode`. */
- (void)setConstrainModeForMode:(MBMConstrainMode)mode;
/** Sets the `viewport mode`. */
- (void)setViewportModeForMode:(MBMViewportMode)mode;
/**
 * Sets the map `center altitude mode` that defines behavior of the center point
 * altitude for all subsequent camera manipulations.
 */
- (void)setCenterAltitudeModeForMode:(MBMMapCenterAltitudeMode)mode;
/**
 * Returns the map's `center altitude mode`.
 *
 * @return The map's `center altitude mode`.
 */
- (MBMMapCenterAltitudeMode)getCenterAltitudeMode;
/**
 * Returns the `map options`.
 *
 * @return The map's `map options`.
 */
- (nonnull MBMMapOptions *)getMapOptions __attribute((ns_returns_retained));
/**
 * Returns the `map debug options`.
 *
 * @return An array of `map debug options` flags currently set to the map.
 */
- (nonnull NSArray<NSNumber *> *)getDebug __attribute((ns_returns_retained));
/**
 * Sets the `map debug options` and enables debug mode based on the passed value.
 *
 * @param debugOptions An array of `map debug options` to be set.
 * @param value A `boolean` value representing the state for a given `map debug options`.
 *
 */
- (void)setDebugForDebugOptions:(nonnull NSArray<NSNumber *> *)debugOptions
                          value:(BOOL)value;
- (nonnull id<MBXCancelable>)queryRenderedFeaturesForGeometry:(nonnull MBMRenderedQueryGeometry *)geometry
                                                      options:(nonnull MBMRenderedQueryOptions *)options
                                                     callback:(nonnull MBMQueryRenderedFeaturesCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)queryRenderedFeaturesForGeometry:(nonnull MBMRenderedQueryGeometry *)geometry
                                                      targets:(nullable NSArray<MBMFeaturesetQueryTarget *> *)targets
                                                     callback:(nonnull MBMQueryRenderedFeaturesCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)querySourceFeaturesForSourceId:(nonnull NSString *)sourceId
                                                    options:(nonnull MBMSourceQueryOptions *)options
                                                   callback:(nonnull MBMQuerySourceFeaturesCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)querySourceFeaturesForTarget:(nonnull MBMFeaturesetQueryTarget *)target
                                                 callback:(nonnull MBMQuerySourceFeaturesCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)queryFeatureExtensionsForSourceIdentifier:(nonnull NSString *)sourceIdentifier
                                                               feature:(nonnull MBXFeature *)feature
                                                             extension:(nonnull NSString *)extension
                                                        extensionField:(nonnull NSString *)extensionField
                                                                  args:(nullable NSDictionary<NSString *, id> *)args
                                                              callback:(nonnull MBMQueryFeatureExtensionCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)setFeatureStateForSourceId:(nonnull NSString *)sourceId
                                          sourceLayerId:(nullable NSString *)sourceLayerId
                                              featureId:(nonnull NSString *)featureId
                                                  state:(nonnull id)state
                                               callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)setFeatureStateForFeatureset:(nonnull MBMFeaturesetDescriptor *)featureset
                                                featureId:(nonnull MBMFeaturesetFeatureId *)featureId
                                                    state:(nonnull id)state
                                                 callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)getFeatureStateForSourceId:(nonnull NSString *)sourceId
                                          sourceLayerId:(nullable NSString *)sourceLayerId
                                              featureId:(nonnull NSString *)featureId
                                               callback:(nonnull MBMQueryFeatureStateCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)getFeatureStateForFeatureset:(nonnull MBMFeaturesetDescriptor *)featureset
                                                featureId:(nonnull MBMFeaturesetFeatureId *)featureId
                                                 callback:(nonnull MBMQueryFeatureStateCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)removeFeatureStateForSourceId:(nonnull NSString *)sourceId
                                             sourceLayerId:(nullable NSString *)sourceLayerId
                                                 featureId:(nonnull NSString *)featureId
                                                  stateKey:(nullable NSString *)stateKey
                                                  callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)removeFeatureStateForFeatureset:(nonnull MBMFeaturesetDescriptor *)featureset
                                                   featureId:(nonnull MBMFeaturesetFeatureId *)featureId
                                                    stateKey:(nullable NSString *)stateKey
                                                    callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)resetFeatureStatesForSourceId:(nonnull NSString *)sourceId
                                             sourceLayerId:(nullable NSString *)sourceLayerId
                                                  callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull id<MBXCancelable>)resetFeatureStatesForFeatureset:(nonnull MBMFeaturesetDescriptor *)featureset
                                                    callback:(nonnull MBMFeatureStateOperationCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (void)setTileCacheBudgetForTileCacheBudget:(nullable MBMTileCacheBudget *)tileCacheBudget NS_REFINED_FOR_SWIFT;
/** Reduces memory use. Useful to call when the application gets paused or sent to background. */
- (void)reduceMemoryUse;
/**
 * Gets elevation for the given coordinate.
 * Note: Elevation is only available for the visible region on the screen.
 *
 * @param coordinate The `coordinate` defined as longitude-latitude pair.
 * @return The elevation (in meters) multiplied by current terrain exaggeration, or empty if elevation for the coordinate is not available.
 */
- (nullable NSNumber *)getElevationForCoordinate:(CLLocationCoordinate2D)coordinate __attribute((ns_returns_retained));
- (void)setViewAnnotationPositionsUpdateListenerForListener:(nullable id<MBMViewAnnotationPositionsUpdateListener>)listener;
- (nonnull MBXExpected<NSNull *, NSString *> *)addViewAnnotationForIdentifier:(nonnull NSString *)identifier
                                                                      options:(nonnull MBMViewAnnotationOptions *)options __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)updateViewAnnotationForIdentifier:(nonnull NSString *)identifier
                                                                         options:(nonnull MBMViewAnnotationOptions *)options __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setViewAnnotationAvoidLayersForLayerIds:(nullable NSSet<NSString *> *)layerIds __attribute((ns_returns_retained));
- (nonnull NSSet<NSString *> *)getViewAnnotationAvoidLayers __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeViewAnnotationForIdentifier:(nonnull NSString *)identifier __attribute((ns_returns_retained));
- (nonnull MBXExpected<MBMViewAnnotationOptions *, NSString *> *)getViewAnnotationOptionsForIdentifier:(nonnull NSString *)identifier __attribute((ns_returns_retained));
/**
 * Enable real-time collection of map rendering performance statistics, for development purposes. Use after `render()` has
 * been called for the first time.
 *
 * Collects CPU, GPU resource usage and timings of layers and rendering groups over a user-configurable sampling duration.
 * Use the collected information to find which layers or rendering groups might be performing poorly. Use
 * `PerformanceStatisticsOptions` to configure the following statistics collection behaviors:
 * <ul>
 *     <li>Specify the types of sampling: cumulative, per-frame, or both.</li>
 *     <li>Define the minimum amount of time over which to perform sampling.</li>
 * </ul>
 *
 * Utilize `PerformanceStatisticsCallback` to observe the collected performance statistics. The callback function is invoked
 * after the configured sampling duration has elapsed. The callback is invoked on the main thread. The collection process is
 * continuous; without user-input, it restarts after each callback invocation. Note: Specifying a negative sampling duration
 * or omitting the callback function will result in no operation, which will be logged for visibility.
 *
 * In order to stop the collection process, call `stopPerformanceStatisticsCollection.`
 *
 * @param options Statistics collection options
 * @param callback The callback to be invoked when statistics are available after the configured amount of
 * time.
 */
- (void)startPerformanceStatisticsCollectionForOptions:(nonnull MBMPerformanceStatisticsOptions *)options
                                              callback:(nonnull MBMPerformanceStatisticsCallback)callback;
/**
 * Disable performance statistics collection.
 *
 * Calling `stopPerformanceStatisticsCollection` when no collection is enabled is a no-op. After calling
 * `startPerformanceStatisticsCollection`, `stopPerformanceStatisticsCollection` must be called before collection can be
 * restarted.
 */
- (void)stopPerformanceStatisticsCollection;
/**
 * Returns attributions for the data used by the Map's style.
 *
 * @return An array of attributions for the data sources used by the Map's style.
 *
 */
- (nonnull NSArray<NSString *> *)getAttributions __attribute((ns_returns_retained));
- (nonnull id<MBXCancelable>)addInteractionForInteraction:(nonnull MBMInteraction *)interaction __attribute((ns_returns_retained));
- (void)dispatchForEventInfo:(nonnull MBMPlatformEventInfo *)eventInfo;
- (void)setScreenCullingShapeForShape:(nonnull NSArray<MBMVec2 *> *)shape;
- (nonnull NSArray<MBMVec2 *> *)getScreenCullingShape __attribute((ns_returns_retained));
- (void)resetThreadServiceType;

@end
