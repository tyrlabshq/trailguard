// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMFeaturesetQueryTarget;
@class MBMQueriedFeature;

/**
 * Represents query result that is returned in QueryRenderedFeaturesCallback.
 * @see `queryRenderedFeatures`
 */
NS_SWIFT_NAME(QueriedRenderedFeature)
__attribute__((visibility ("default")))
@interface MBMQueriedRenderedFeature : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** Feature returned by the query. */
@property (nonatomic, readonly, nonnull) MBMQueriedFeature *queriedFeature;

/**
 * An array of layer Ids for the queried feature.
 * If the feature has been rendered in multiple layers, multiple Ids will be provided.
 * If the feature is only rendered in one layer, a single Id will be provided.
 */
@property (nonatomic, readonly, nonnull, copy) NSArray<NSString *> *layers;


@end
