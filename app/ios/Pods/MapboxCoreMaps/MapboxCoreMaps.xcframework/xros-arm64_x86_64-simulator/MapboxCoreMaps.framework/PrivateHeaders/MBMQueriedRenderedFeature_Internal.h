// This file is generated and will be overwritten automatically.

#import <MapboxCoreMaps/MBMQueriedRenderedFeature.h>

@interface MBMQueriedRenderedFeature ()
- (nonnull instancetype)initWithQueriedFeature:(nonnull MBMQueriedFeature *)queriedFeature
                                        layers:(nonnull NSArray<NSString *> *)layers
                                       targets:(nonnull NSArray<MBMFeaturesetQueryTarget *> *)targets NS_REFINED_FOR_SWIFT;
@property (nonatomic, readonly, nonnull, copy) NSArray<MBMFeaturesetQueryTarget *> *targets NS_REFINED_FOR_SWIFT;
@end
