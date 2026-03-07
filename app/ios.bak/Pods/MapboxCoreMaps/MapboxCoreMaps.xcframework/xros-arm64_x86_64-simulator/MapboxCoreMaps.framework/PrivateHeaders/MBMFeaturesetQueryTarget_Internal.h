// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMFeaturesetDescriptor;

NS_SWIFT_NAME(FeaturesetQueryTarget)
__attribute__((visibility ("default")))
@interface MBMFeaturesetQueryTarget : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithFeatureset:(nonnull MBMFeaturesetDescriptor *)featureset
                                    filter:(nullable id)filter
                                        id:(nullable NSNumber *)id_;

@property (nonatomic, readonly, nonnull) MBMFeaturesetDescriptor *featureset;
/** An optional filter expression used to refine the query results based on conditions related to the specified featureset. */
@property (nonatomic, readonly, nullable, copy) id filter;

/** An optional unique identifier associated with the FeaturesetQueryTarget. */
@property (nonatomic, readonly, nullable) NSNumber *id;


- (BOOL)isEqualToFeaturesetQueryTarget:(nonnull MBMFeaturesetQueryTarget *)other;

@end
