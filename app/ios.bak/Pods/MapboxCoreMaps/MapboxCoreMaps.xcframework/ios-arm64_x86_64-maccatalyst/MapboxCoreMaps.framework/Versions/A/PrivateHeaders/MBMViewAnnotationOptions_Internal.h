// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMAnnotatedFeature;
@class MBMViewAnnotationAnchorConfig;

NS_SWIFT_NAME(ViewAnnotationOptions)
__attribute__((visibility ("default")))
@interface MBMViewAnnotationOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithAnnotatedFeature:(nullable MBMAnnotatedFeature *)annotatedFeature
                                           width:(nullable NSNumber *)width
                                          height:(nullable NSNumber *)height
                                    allowOverlap:(nullable NSNumber *)allowOverlap
                            allowOverlapWithPuck:(nullable NSNumber *)allowOverlapWithPuck
                                   allowZElevate:(nullable NSNumber *)allowZElevate
                                         visible:(nullable NSNumber *)visible
                                 variableAnchors:(nullable NSArray<MBMViewAnnotationAnchorConfig *> *)variableAnchors
                                        selected:(nullable NSNumber *)selected
                                        priority:(nullable NSNumber *)priority
                             ignoreCameraPadding:(nullable NSNumber *)ignoreCameraPadding
                                         minZoom:(nullable NSNumber *)minZoom
                                         maxZoom:(nullable NSNumber *)maxZoom NS_REFINED_FOR_SWIFT;

@property (nonatomic, readonly, nullable) MBMAnnotatedFeature *annotatedFeature;
/** View annotation width in `platform pixels`. */
@property (nonatomic, readonly, nullable) NSNumber *width NS_REFINED_FOR_SWIFT;

/** View annotation height in `platform pixels`. */
@property (nonatomic, readonly, nullable) NSNumber *height NS_REFINED_FOR_SWIFT;

/**
 * If true, the annotation will be visible even if it collides with other previously drawn annotations.
 *
 * When adding new annotations, if `allowOverlap` is not explicitly set, default value `false` will be applied.
 * When updating existing annotations, if `allowOverlap` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *allowOverlap NS_REFINED_FOR_SWIFT;

/**
 * If true, the annotation will be visible even if it collides with the puck.
 *
 * When adding new annotations, if `allowOverlapWithPuck` is not explicitly set, default value `false` will be applied.
 * When updating existing annotations, if `allowOverlapWithPuck` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *allowOverlapWithPuck NS_REFINED_FOR_SWIFT;

/**
 * If true, position annotation on buildings' (both fill extrusions and models) rooftops.
 *
 * When adding new annotations, if `allowZElevate` is not explicitly set, default value `false` will be applied.
 * When updating existing annotations, if `allowZElevate` is not explicitly set, the current value will be retained.
 *
 * Note: In case the annotation is associated with a symbol layer, and the annotation's `allowZElevate`
 * is not explicitly set, its `allowZElevate` value will be overridden by the symbol layer's `symbol-z-elevate` value.
 */
@property (nonatomic, readonly, nullable) NSNumber *allowZElevate NS_REFINED_FOR_SWIFT;

/**
 * Specifies if this view annotation is visible or not.
 *
 * Note: For Android and iOS platforms, if this property is not specified explicitly when creating / updating view annotation, visibility will be
 * handled automatically based on actual Android or iOS view's visibility e.g. if actual view is set to be not visible - Android / iOS part
 * will automatically update view annotation to have `visible = false`.
 *
 * When adding new annotations, if `visible` is not explicitly set, default value `true` will be applied.
 * When updating existing annotations, if `visible` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *visible NS_REFINED_FOR_SWIFT;

/**
 * Provide anchor choices for annotation placement.
 * The first anchor in the list that allows the view annotation to be placed in the view is picked.
 * If the array is empty, the default `ViewAnnotationAnchorConfig` value will be applied.
 *
 * When adding new annotations, if `variableAnchor` is not explicitly set, the default `ViewAnnotationAnchorConfig` value will be applied.
 * When updating existing annotations, if `variableAnchor` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable, copy) NSArray<MBMViewAnnotationAnchorConfig *> *variableAnchors;

/**
 * Specifies if this view annotation is selected meaning it should be placed on top of others.
 *
 * When adding new annotations, if `selected` is not explicitly set, default value `false` will be applied.
 * When updating existing annotations, if `selected` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *selected NS_REFINED_FOR_SWIFT __attribute__((deprecated));

/**
 * Sorts annotations in descending order based on this value.
 *
 * A replacement for the deprecated `selected` field.
 * Simultaneous use of `priority` and `selected` fileds should be avoided.
 * Annotations with higher priority keys are drawn and placed first.
 * When equal priorities, less-anchor-options and least-recently-added sequentially used for annotations placement order.
 * `priority` field defaults to 0 when not set explicitly.
 * Negative, 0, positive values could be used in `priority` field.
 *
 * When updating existing annotations, if `priority` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *priority NS_REFINED_FOR_SWIFT;

/**
 * If true, the annotation will be visible even if it is outside the bound that defined by the camera padding.
 *
 * When adding new annotations, if `ignoreCameraPadding` is not explicitly set, default value `false` will be applied.
 * When updating existing annotations, if `ignoreCameraPadding` is not explicitly set, the current value will be retained.
 */
@property (nonatomic, readonly, nullable) NSNumber *ignoreCameraPadding NS_REFINED_FOR_SWIFT;

/**
 * minimum zoom value in Mapbox zoom levels [0.0-25.5] to display View Annotation.
 * if not provided or is out of range, defaults to 0.0.
 */
@property (nonatomic, readonly, nullable) NSNumber *minZoom NS_REFINED_FOR_SWIFT;

/**
 * maximum zoom value in Mapbox zoom levels [0.0, 25.5] to display View Annotation.
 * should be greater than or equal to minZoom.
 * if not provided or is out of range, defaults to 25.5.
 */
@property (nonatomic, readonly, nullable) NSNumber *maxZoom NS_REFINED_FOR_SWIFT;


@end
