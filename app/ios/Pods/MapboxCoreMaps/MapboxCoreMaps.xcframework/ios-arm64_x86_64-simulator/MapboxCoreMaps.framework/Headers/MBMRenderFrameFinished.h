// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMRenderModeType.h>

@class MBMEventTimeInterval;

/**
 * The `map` finished rendering a frame.
 *
 * Note: The `map` will emit the event asynchronously so the user-provided
 * callback does not stall the rendering pipeline.
 */
NS_SWIFT_NAME(RenderFrameFinished)
__attribute__((visibility ("default")))
@interface MBMRenderFrameFinished : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithRenderMode:(MBMRenderModeType)renderMode
                              needsRepaint:(BOOL)needsRepaint
                          placementChanged:(BOOL)placementChanged
                              timeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/**
 * The property tells whether the `map` rendered the frame with all required
 * or partially available data.
 */
@property (nonatomic, readonly) MBMRenderModeType renderMode;

/** The property provides information about whether the `map` will request rendering of the next frame. */
@property (nonatomic, readonly) BOOL needsRepaint;

/** The property tells if the symbol placement has been changed in the visible viewport. */
@property (nonatomic, readonly) BOOL placementChanged;

/**
 * The `timeInterval.begin` is when the `map` started rendering the frame, and
 * `timeInterval.end` is when the frame was rendered.
 */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
