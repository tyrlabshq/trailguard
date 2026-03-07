// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(FeaturesetFeatureId)
__attribute__((visibility ("default")))
@interface MBMFeaturesetFeatureId : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithFeatureId:(nonnull NSString *)featureId
                         featureNamespace:(nullable NSString *)featureNamespace;

/**
 * The `featureId` uniquely identifies a feature within a featureset or layer.
 *
 * Note: The Identifier of the feature is not guaranteed to be persistent and can change depending on the source that is used.
 */
@property (nonatomic, readonly, nonnull, copy) NSString *featureId;

/**
 * An optional field that represents the feature namespace defined by the Selector within a Featureset to which this feature belongs.
 * If the underlying source is the same for multiple selectors within a Featureset, the same `featureNamespace` should be used across those selectors.
 * This practice ensures the uniqueness of `FeaturesetFeatureId` across the style.
 * Defining a `featureNamespace` value for the Selector is recommended, especially when multiple selectors exist in a Featureset, as it can enhance the efficiency of feature operations.
 */
@property (nonatomic, readonly, nullable, copy) NSString *featureNamespace;


@end
