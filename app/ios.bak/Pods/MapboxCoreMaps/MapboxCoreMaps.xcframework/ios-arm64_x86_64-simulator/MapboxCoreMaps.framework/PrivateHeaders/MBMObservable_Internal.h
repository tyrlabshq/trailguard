// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMCameraChangedCallback.h>
#import <MapboxCoreMaps/MBMGenericEventCallback.h>
#import <MapboxCoreMaps/MBMMapIdleCallback.h>
#import <MapboxCoreMaps/MBMMapLoadedCallback.h>
#import <MapboxCoreMaps/MBMMapLoadingErrorCallback.h>
#import <MapboxCoreMaps/MBMRenderFrameFinishedCallback.h>
#import <MapboxCoreMaps/MBMRenderFrameStartedCallback.h>
#import <MapboxCoreMaps/MBMResourceRequestCallback.h>
#import <MapboxCoreMaps/MBMSourceAddedCallback.h>
#import <MapboxCoreMaps/MBMSourceDataLoadedCallback.h>
#import <MapboxCoreMaps/MBMSourceRemovedCallback.h>
#import <MapboxCoreMaps/MBMStyleDataLoadedCallback.h>
#import <MapboxCoreMaps/MBMStyleImageMissingCallback.h>
#import <MapboxCoreMaps/MBMStyleImageRemoveUnusedCallback.h>
#import <MapboxCoreMaps/MBMStyleLoadedCallback.h>

@protocol MBXCancelable;

NS_SWIFT_NAME(Observable)
__attribute__((visibility ("default")))
@interface MBMObservable : NSObject

/**
 * Subscribes to `MapLoaded` event.
 *
 * @return cancellation object.
 *
 * @see MapLoadedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForMapLoaded:(nonnull MBMMapLoadedCallback)mapLoaded __attribute((ns_returns_retained));
/**
 * Subscribes to `MapIdle` event.
 *
 * @return cancellation object.
 *
 * @see MapIdleCallback
 */
- (nonnull id<MBXCancelable>)subscribeForMapIdle:(nonnull MBMMapIdleCallback)mapIdle __attribute((ns_returns_retained));
/**
 * Subscribes to `MapLoadingError` event.
 *
 * @return cancellation object.
 *
 * @see MapLoadingErrorCallback
 */
- (nonnull id<MBXCancelable>)subscribeForMapLoadingError:(nonnull MBMMapLoadingErrorCallback)mapLoadingError __attribute((ns_returns_retained));
/**
 * Subscribes to `StyleLoaded` event.
 *
 * @return cancellation object.
 *
 * @see StyleLoadedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForStyleLoaded:(nonnull MBMStyleLoadedCallback)styleLoaded __attribute((ns_returns_retained));
/**
 * Subscribes to `StyleDataLoaded` event.
 *
 * @return cancellation object.
 *
 * @see StyleDataLoadedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForStyleDataLoaded:(nonnull MBMStyleDataLoadedCallback)styleDataLoaded __attribute((ns_returns_retained));
/**
 * Subscribes to `SourceDataLoaded` event.
 *
 * @return cancellation object.
 *
 * @see SourceDataLoadedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForSourceDataLoaded:(nonnull MBMSourceDataLoadedCallback)sourceDataLoaded __attribute((ns_returns_retained));
/**
 * Subscribes to `SourceAdded` event.
 *
 * @return cancellation object.
 *
 * @see SourceAddedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForSourceAdded:(nonnull MBMSourceAddedCallback)sourceAdded __attribute((ns_returns_retained));
/**
 * Subscribes to `SourceRemoved` event.
 *
 * @return cancellation object.
 *
 * @see SourceRemovedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForSourceRemoved:(nonnull MBMSourceRemovedCallback)sourceRemoved __attribute((ns_returns_retained));
/**
 * Subscribes to `StyleImageMissing` event.
 *
 * @return cancellation object.
 *
 * @see StyleImageMissingCallback
 */
- (nonnull id<MBXCancelable>)subscribeForStyleImageMissing:(nonnull MBMStyleImageMissingCallback)styleImageMissing __attribute((ns_returns_retained));
/**
 * Subscribes to `StyleImageRemoveUnused` event.
 *
 * @return cancellation object.
 *
 * @see StyleImageRemoveUnusedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForStyleImageRemoveUnused:(nonnull MBMStyleImageRemoveUnusedCallback)styleImageRemoveUnused __attribute((ns_returns_retained));
/**
 * Subscribes to `CameraChanged` event.
 *
 * @return cancellation object.
 *
 * @see CameraChangedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForCameraChanged:(nonnull MBMCameraChangedCallback)cameraChanged __attribute((ns_returns_retained));
/**
 * Subscribes to `RenderFrameStarted` event.
 *
 * @return cancellation object.
 *
 * @see RenderFrameStartedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForRenderFrameStarted:(nonnull MBMRenderFrameStartedCallback)renderFrameStarted __attribute((ns_returns_retained));
/**
 * Subscribes to `RenderFrameFinished` event.
 *
 * @return cancellation object.
 *
 * @see RenderFrameFinishedCallback
 */
- (nonnull id<MBXCancelable>)subscribeForRenderFrameFinished:(nonnull MBMRenderFrameFinishedCallback)renderFrameFinished __attribute((ns_returns_retained));
/**
 * Subscribes to `ResourceRequest` event.
 *
 * @return cancellation object.
 *
 * @see ResourceRequestCallback
 */
- (nonnull id<MBXCancelable>)subscribeForResourceRequest:(nonnull MBMResourceRequestCallback)resourceRequest __attribute((ns_returns_retained));
/**
 * Subscribes to an experimental `GenericEvent` event.
 *
 * @return cancellation object.
 *
 * @see GenericEventCallback
 */
- (nonnull id<MBXCancelable>)subscribeForEventName:(nonnull NSString *)eventName
                                          callback:(nonnull MBMGenericEventCallback)callback __attribute((ns_returns_retained));

@end
