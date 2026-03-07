// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * The `map` started rendering a frame.
 *
 * Note: The `map` will emit the event asynchronously so the user-provided callback
 * does not stall the rendering pipeline.
 */
NS_SWIFT_NAME(RenderFrameStarted)
__attribute__((visibility ("default")))
@interface MBMRenderFrameStarted : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTimestamp:(nonnull NSDate *)timestamp;

/** The timestamp of an event when the `map` started rendering the frame. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
