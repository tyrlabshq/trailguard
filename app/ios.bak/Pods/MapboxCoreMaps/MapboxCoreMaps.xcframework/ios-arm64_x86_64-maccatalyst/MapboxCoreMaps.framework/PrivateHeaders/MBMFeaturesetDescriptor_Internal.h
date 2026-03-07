// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(FeaturesetDescriptor)
__attribute__((visibility ("default")))
@interface MBMFeaturesetDescriptor : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithFeaturesetId:(nullable NSString *)featuresetId
                                    importId:(nullable NSString *)importId
                                     layerId:(nullable NSString *)layerId;

/**
 * An optional unique identifier for the featureset within the style.
 * This id is used to reference a specific featureset.
 *
 * Note: If `featuresetId` is provided and valid, it takes precedence over `layerId`,
 * meaning `layerId` will not be considered even if it has a valid value.
 */
@property (nonatomic, readonly, nullable, copy) NSString *featuresetId;

/**
 * An optional import id that is required if the featureset is defined within an imported style.
 * If the featureset belongs to the current style, this field should be set to a null string.
 *
 * Note: `importId` is only applicable when used in conjunction with `featuresetId`
 * and has no effect when used with `layerId`.
 */
@property (nonatomic, readonly, nullable, copy) NSString *importId;

/**
 * An optional unique identifier for the layer within the current style.
 *
 * Note: If `featuresetId` is valid, `layerId` will be ignored even if it has a valid value.
 * Additionally, `importId` does not apply when using `layerId`.
 */
@property (nonatomic, readonly, nullable, copy) NSString *layerId;


- (BOOL)isEqualToFeaturesetDescriptor:(nonnull MBMFeaturesetDescriptor *)other;

@end
