// This file is generated and will be overwritten automatically.

#import <MapboxCoreMaps/MBMQueriedFeature.h>

@interface MBMQueriedFeature ()
- (nonnull instancetype)initWithFeature:(nonnull MBXFeature *)feature
                                 source:(nonnull NSString *)source
                            sourceLayer:(nullable NSString *)sourceLayer
                                  state:(nonnull id)state
                    featuresetFeatureId:(nullable MBMFeaturesetFeatureId *)featuresetFeatureId NS_REFINED_FOR_SWIFT;
@property (nonatomic, readonly, nullable) MBMFeaturesetFeatureId *featuresetFeatureId;
@end
