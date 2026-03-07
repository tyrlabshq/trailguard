// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
@class MBXFeature;

@class MBMFeaturesetFeatureId;

/** Represents queried feature that is returned through `QueriedRenderedFeature` or `QueriedSourceFeature` */
NS_SWIFT_NAME(QueriedFeature)
__attribute__((visibility ("default")))
@interface MBMQueriedFeature : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/** Feature returned by the query. */
@property (nonatomic, readonly, nonnull) MBXFeature *feature NS_REFINED_FOR_SWIFT;

/** Source id for a queried feature. */
@property (nonatomic, readonly, nonnull, copy) NSString *source;

/**
 * Source layer id for a queried feature. May be null if source does not support layers, e.g., 'geojson' source,
 * or when data provided by the source is not layered.
 */
@property (nonatomic, readonly, nullable, copy) NSString *sourceLayer;

/**
 * Feature state for a queried feature. Type of the value is an Object.
 * @see `setFeatureState` and `getFeatureState`
 */
@property (nonatomic, readonly, nonnull, copy) id state;


@end
