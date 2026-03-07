// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMImage;
@class MBMStylePropertyValue;
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMColorThemeType)
{
    MBMColorThemeTypeImage,
    MBMColorThemeTypeStylePropertyValue
} NS_SWIFT_NAME(ColorThemeType);

NS_SWIFT_NAME(ColorTheme)
__attribute__((visibility ("default")))
@interface MBMColorTheme : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromImage:(nonnull MBMImage *)value;
+ (nonnull instancetype)fromStylePropertyValue:(nonnull MBMStylePropertyValue *)value;

- (BOOL)isImage;
- (BOOL)isStylePropertyValue;

- (nonnull MBMImage *)getImage __attribute((ns_returns_retained));
- (nonnull MBMStylePropertyValue *)getStylePropertyValue __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBMColorThemeType type;

@end
