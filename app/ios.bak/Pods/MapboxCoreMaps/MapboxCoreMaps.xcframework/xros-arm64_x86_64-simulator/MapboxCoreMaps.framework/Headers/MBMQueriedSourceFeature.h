// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMFeaturesetQueryTarget;
@class MBMQueriedFeature;

/**
 * Represents query result that is returned in QuerySourceFeaturesCallback.
 * @see `querySourceFeatures`
 */
NS_SWIFT_NAME(QueriedSourceFeature)
__attribute__((visibility ("default")))
@interface MBMQueriedSourceFeature : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** Feature returned by the query. */
@property (nonatomic, readonly, nonnull) MBMQueriedFeature *queriedFeature;


@end
