// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCameraAnimationHintStage;

NS_SWIFT_NAME(CameraAnimationHint)
__attribute__((visibility ("default")))
@interface MBMCameraAnimationHint : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithStages:(nonnull NSArray<MBMCameraAnimationHintStage *> *)stages;

@property (nonatomic, readonly, nonnull, copy) NSArray<MBMCameraAnimationHintStage *> *stages;

@end
