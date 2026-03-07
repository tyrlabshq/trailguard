// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMScreenBox;
@class MBMScreenCoordinate;
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRenderedQueryGeometryType)
{
    MBMRenderedQueryGeometryTypeScreenBox,
    MBMRenderedQueryGeometryTypeScreenCoordinate,
    MBMRenderedQueryGeometryTypeNSArray
} NS_SWIFT_NAME(RenderedQueryGeometryType);

NS_SWIFT_NAME(RenderedQueryGeometry)
__attribute__((visibility ("default")))
@interface MBMRenderedQueryGeometry : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromScreenBox:(nonnull MBMScreenBox *)value;
+ (nonnull instancetype)fromScreenCoordinate:(nonnull MBMScreenCoordinate *)value;
+ (nonnull instancetype)fromNSArray:(nonnull NSArray<MBMScreenCoordinate *> *)value;

- (BOOL)isScreenBox;
- (BOOL)isScreenCoordinate;
- (BOOL)isNSArray;

- (nonnull MBMScreenBox *)getScreenBox __attribute((ns_returns_retained));
- (nonnull MBMScreenCoordinate *)getScreenCoordinate __attribute((ns_returns_retained));
- (nonnull NSArray<MBMScreenCoordinate *> *)getNSArray __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBMRenderedQueryGeometryType type;

@end
