// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * Options for the following statistics collection behaviors:
 * <ul>
 *     <li>Specify the types of sampling: cumulative, per-frame, or both.</li>
 *     <li>Define the minimum elapsed time for collecting performance samples.</li>
 * </ul>
 */
NS_SWIFT_NAME(PerformanceStatisticsOptions)
__attribute__((visibility ("default")))
@interface MBMPerformanceStatisticsOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;


/**
 * The minimum elapsed time required before performance statistics become available. It's important to note that the actual
 * collection interval may exceed this duration since statistics are aggregated during render calls. The effective collection
 * interval can be observed through the `PerformanceStatistics` instance.
 *
 * Setting `samplingDurationMillis` to 0 forces the collection of performance statistics every frame.
 *
 * A negative sampling duration is an error and results in no operation.
 *
 * @see PerformanceStatistics
 */
@property (nonatomic, readonly) double samplingDurationMillis;


- (BOOL)isEqualToPerformanceStatisticsOptions:(nonnull MBMPerformanceStatisticsOptions *)other;

@end
