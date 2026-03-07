// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMPerformanceStatistics;

/**
 * Use this callback to observe the collected statistics. The callback is invoked at regular intervals determined by
 * the sampling duration specified in the `PerformanceStatisticsOptions`. The callback is invoked from the main thread.
 * @see PerformanceStatisticsOptions
 */
NS_SWIFT_NAME(PerformanceStatisticsCallback)
typedef void (^MBMPerformanceStatisticsCallback)(MBMPerformanceStatistics * _Nonnull performanceStatistics); // NOLINT(modernize-use-using)
