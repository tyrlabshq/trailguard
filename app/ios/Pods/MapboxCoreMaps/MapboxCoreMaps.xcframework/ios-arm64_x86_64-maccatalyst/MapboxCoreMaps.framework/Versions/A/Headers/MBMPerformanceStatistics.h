// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMCumulativeRenderingStatistics;
@class MBMDurationStatistics;
@class MBMPerFrameRenderingStatistics;

/** The performance statistics collected at the end of the sampling duration. */
NS_SWIFT_NAME(PerformanceStatistics)
__attribute__((visibility ("default")))
@interface MBMPerformanceStatistics : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithCollectionDurationMillis:(double)collectionDurationMillis
                             mapRenderDurationStatistics:(nonnull MBMDurationStatistics *)mapRenderDurationStatistics
                                    cumulativeStatistics:(nullable MBMCumulativeRenderingStatistics *)cumulativeStatistics
                                      perFrameStatistics:(nullable MBMPerFrameRenderingStatistics *)perFrameStatistics;

/**
 * The actual amount of time elapsed during statistics collection. Note that this duration is always a little bit larger
 * than the configured duration, as collection happens at a fixed point during the map render call.
 */
@property (nonatomic, readonly) double collectionDurationMillis;

/** The CPU timeline duration statistics of the map render call. */
@property (nonatomic, readonly, nonnull) MBMDurationStatistics *mapRenderDurationStatistics;

/** Cumulative, continuously tracked, resource stats. Enable using the `CumulativeRenderingStats` performance sampler option. */
@property (nonatomic, readonly, nullable) MBMCumulativeRenderingStatistics *cumulativeStatistics;

/** Aggregated, per-frame, timings. Enable using the  `PerFrameRenderingStats` performance sampler option. */
@property (nonatomic, readonly, nullable) MBMPerFrameRenderingStatistics *perFrameStatistics;


@end
