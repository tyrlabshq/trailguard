// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCameraOptions;

NS_SWIFT_NAME(CameraAnimationHintStage)
__attribute__((visibility ("default")))
@interface MBMCameraAnimationHintStage : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithProgress:(NSTimeInterval)progress
                                  camera:(nonnull MBMCameraOptions *)camera;

/** The duration elapsed since the animation start (i.e. from invocation of the `setUserAnimationInProgress(true)` method). */
@property (nonatomic, readonly) NSTimeInterval progress;

@property (nonatomic, readonly, nonnull) MBMCameraOptions *camera;

@end
