// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(AnnotatedLayerFeature)
__attribute__((visibility ("default")))
@interface MBMAnnotatedLayerFeature : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithLayerId:(nonnull NSString *)layerId
                              featureId:(nullable NSString *)featureId;

/**
 * Associates the view annotation with a style layer ID that corresponds to its source feature's geometry. This enables dynamic
 * placement of view annotations within the feature geometry associated with the specified layer.
 */
@property (nonatomic, readonly, nonnull, copy) NSString *layerId;

/**
 * Links the view annotation to a particular feature using its feature ID within the layer. The view annotation
 * remains hidden if the feature is offscreen. A null value indicates that any feature within the source
 * can be utilized to position the annotation.
 * In the case of a symbol layer, if the associated feature's symbol is hidden, the annotation will also remain invisible.
 * Only valid feature IDs are permissible; otherwise, an error will be raised.
 */
@property (nonatomic, readonly, nullable, copy) NSString *featureId;


- (BOOL)isEqualToAnnotatedLayerFeature:(nonnull MBMAnnotatedLayerFeature *)other;

@end
