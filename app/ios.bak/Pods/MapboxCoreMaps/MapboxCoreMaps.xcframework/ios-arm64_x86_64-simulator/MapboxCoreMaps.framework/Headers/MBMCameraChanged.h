// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCameraState;

/**
 * This event is emitted whenever the visible viewport changes its size
 * due to the invocation of the `setSize` and `setBounds` methods or when
 * the camera is modified by calling camera methods. The event is emitted
 * synchronously so that an updated camera state can be read immediately.
 */
NS_SWIFT_NAME(CameraChanged)
__attribute__((visibility ("default")))
@interface MBMCameraChanged : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** The time when the camera was changed. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
