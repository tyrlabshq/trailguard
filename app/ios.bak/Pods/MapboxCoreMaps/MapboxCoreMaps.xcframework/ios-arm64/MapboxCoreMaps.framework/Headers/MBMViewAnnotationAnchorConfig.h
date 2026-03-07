// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMViewAnnotationAnchor.h>

/** Represents a specific setting for a view annotation anchor. */
NS_SWIFT_NAME(ViewAnnotationAnchorConfig)
__attribute__((visibility ("default")))
@interface MBMViewAnnotationAnchorConfig : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithAnchor:(MBMViewAnnotationAnchor)anchor
                               offsetX:(double)offsetX
                               offsetY:(double)offsetY NS_REFINED_FOR_SWIFT;

/**
 * Anchor describing where the view annotation will be located relatively to given geometry.
 * The default value is `CENTER`.
 */
@property (nonatomic, readonly) MBMViewAnnotationAnchor anchor;

/**
 * Extra X offset in `platform pixels`.
 * Providing positive value moves view annotation to the right while negative moves it to the left.
 * The default value is 0.
 */
@property (nonatomic, readonly) double offsetX;

/**
 * Extra Y offset in `platform pixels`.
 * Providing positive value moves view annotation to the top while negative moves it to the bottom.
 * The default value is 0.
 */
@property (nonatomic, readonly) double offsetY;


- (BOOL)isEqualToViewAnnotationAnchorConfig:(nonnull MBMViewAnnotationAnchorConfig *)other;

@end
