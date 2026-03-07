// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMCustomRasterSourceTileStatusChangedCallback.h>

@protocol MBMCustomRasterSourceTileRenderer;
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMCustomRasterSourceClientType)
{
    MBMCustomRasterSourceClientTypeCustomRasterSourceTileStatusChangedCallback,
    MBMCustomRasterSourceClientTypeCustomRasterSourceTileRenderer
} NS_SWIFT_NAME(CustomRasterSourceClientType);

NS_SWIFT_NAME(CustomRasterSourceClient)
__attribute__((visibility ("default")))
@interface MBMCustomRasterSourceClient : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromCustomRasterSourceTileStatusChangedCallback:(nonnull MBMCustomRasterSourceTileStatusChangedCallback)value;
+ (nonnull instancetype)fromCustomRasterSourceTileRenderer:(nonnull id<MBMCustomRasterSourceTileRenderer>)value;

- (BOOL)isCustomRasterSourceTileStatusChangedCallback;
- (BOOL)isCustomRasterSourceTileRenderer;

- (nonnull MBMCustomRasterSourceTileStatusChangedCallback)getCustomRasterSourceTileStatusChangedCallback __attribute((ns_returns_retained));
- (nonnull id<MBMCustomRasterSourceTileRenderer>)getCustomRasterSourceTileRenderer __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBMCustomRasterSourceClientType type;

@end
