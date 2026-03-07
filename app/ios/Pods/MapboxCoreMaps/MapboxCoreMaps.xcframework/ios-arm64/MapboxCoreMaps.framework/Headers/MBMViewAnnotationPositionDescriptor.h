// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

@class MBMScreenCoordinate;
@class MBMViewAnnotationAnchorConfig;

/**
 * Read-only data that is needed to correctly position the single view annotation on screen.
 * Used inside ViewAnnotationPositionsUpdateListener callback to notify the listener about the visible view annotations' position updates.
 *
 */
NS_SWIFT_NAME(ViewAnnotationPositionDescriptor)
__attribute__((visibility ("default")))
@interface MBMViewAnnotationPositionDescriptor : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** Unique id in order to lookup an actual view in platform SDKs. */
@property (nonatomic, readonly, nonnull, copy) NSString *identifier;

/** View annotation width in `platform pixels` for drawing the annotation. */
@property (nonatomic, readonly) double width;

/** View annotation height in `platform pixels` for drawing the annotation. */
@property (nonatomic, readonly) double height;

/** The actual geometric position used for positioning this annotation. */
@property (nonatomic, readonly) CLLocationCoordinate2D anchorCoordinate;

/** The chosen anchor option for view annotation. */
@property (nonatomic, readonly, nonnull) MBMViewAnnotationAnchorConfig *anchorConfig;


@end
