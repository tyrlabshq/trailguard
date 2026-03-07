// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCameraChanged;

/**
 * This event is emitted whenever the visible viewport changes its size
 * due to the invocation of the `setSize` and `setBounds` methods or when
 * the camera is modified by calling camera methods. The event is emitted
 * synchronously so that an updated camera state can be fetched immediately.
 *
 * @see CameraChanged
 */
NS_SWIFT_NAME(CameraChangedCallback)
typedef void (^MBMCameraChangedCallback)(MBMCameraChanged * _Nonnull cameraChanged); // NOLINT(modernize-use-using)
