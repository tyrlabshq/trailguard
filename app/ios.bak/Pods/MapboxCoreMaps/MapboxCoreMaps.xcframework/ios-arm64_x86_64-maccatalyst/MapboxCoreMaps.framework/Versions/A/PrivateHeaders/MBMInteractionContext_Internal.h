// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCoordinateInfo;
@class MBMScreenCoordinate;

NS_SWIFT_NAME(InteractionContext)
__attribute__((visibility ("default")))
@interface MBMInteractionContext : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithCoordinateInfo:(nonnull MBMCoordinateInfo *)coordinateInfo
                              screenCoordinate:(nonnull MBMScreenCoordinate *)screenCoordinate;

/** The geographical coordinate at which interaction has happened. */
@property (nonatomic, readonly, nonnull) MBMCoordinateInfo *coordinateInfo;

@property (nonatomic, readonly, nonnull) MBMScreenCoordinate *screenCoordinate;

@end
