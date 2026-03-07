// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(DurationStatistics)
__attribute__((visibility ("default")))
@interface MBMDurationStatistics : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithMaxMillis:(double)maxMillis
                             medianMillis:(double)medianMillis;

/** The largest measured duration over the sampling window. */
@property (nonatomic, readonly) double maxMillis;

/** The median duration over the sampling window. */
@property (nonatomic, readonly) double medianMillis;


@end
