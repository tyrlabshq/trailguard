// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMScreenCoordinate;

NS_SWIFT_NAME(ScreenBox)
__attribute__((visibility ("default")))
@interface MBMScreenBox : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithMin:(nonnull MBMScreenCoordinate *)min
                                max:(nonnull MBMScreenCoordinate *)max;

@property (nonatomic, readonly, nonnull) MBMScreenCoordinate *min;
@property (nonatomic, readonly, nonnull) MBMScreenCoordinate *max;

- (BOOL)isEqualToScreenBox:(nonnull MBMScreenBox *)other;

@end
