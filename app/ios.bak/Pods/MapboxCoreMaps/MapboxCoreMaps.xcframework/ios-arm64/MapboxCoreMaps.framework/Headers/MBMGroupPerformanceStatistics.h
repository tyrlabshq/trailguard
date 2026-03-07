// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(GroupPerformanceStatistics)
__attribute__((visibility ("default")))
@interface MBMGroupPerformanceStatistics : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithDurationMillis:(double)durationMillis
                                          name:(nonnull NSString *)name;

/** The duration of the group or layer on the CPU timeline. */
@property (nonatomic, readonly) double durationMillis;

/** The name of the group or layer. */
@property (nonatomic, readonly, nonnull, copy) NSString *name;


@end
