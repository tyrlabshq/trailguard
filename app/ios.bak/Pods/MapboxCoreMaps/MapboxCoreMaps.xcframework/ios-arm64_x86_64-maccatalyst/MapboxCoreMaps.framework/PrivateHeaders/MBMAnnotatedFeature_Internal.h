// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
@class MBXGeometry;

@class MBMAnnotatedLayerFeature;
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMAnnotatedFeatureType)
{
    MBMAnnotatedFeatureTypeGeometry,
    MBMAnnotatedFeatureTypeAnnotatedLayerFeature
} NS_SWIFT_NAME(AnnotatedFeatureType);

NS_SWIFT_NAME(AnnotatedFeature)
__attribute__((visibility ("default")))
@interface MBMAnnotatedFeature : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromGeometry:(nonnull MBXGeometry *)value;
+ (nonnull instancetype)fromAnnotatedLayerFeature:(nonnull MBMAnnotatedLayerFeature *)value;

- (BOOL)isGeometry;
- (BOOL)isAnnotatedLayerFeature;

- (nonnull MBXGeometry *)getGeometry __attribute((ns_returns_retained));
- (nonnull MBMAnnotatedLayerFeature *)getAnnotatedLayerFeature __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBMAnnotatedFeatureType type;

@end
