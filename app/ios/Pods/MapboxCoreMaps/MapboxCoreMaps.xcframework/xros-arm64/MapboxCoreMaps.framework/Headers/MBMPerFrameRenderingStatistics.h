// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMDurationStatistics;
@class MBMGroupPerformanceStatistics;

NS_SWIFT_NAME(PerFrameRenderingStatistics)
__attribute__((visibility ("default")))
@interface MBMPerFrameRenderingStatistics : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTopRenderGroups:(nonnull NSArray<MBMGroupPerformanceStatistics *> *)topRenderGroups
                                topRenderLayers:(nonnull NSArray<MBMGroupPerformanceStatistics *> *)topRenderLayers
                    shadowMapDurationStatistics:(nonnull MBMDurationStatistics *)shadowMapDurationStatistics
                       uploadDurationStatistics:(nonnull MBMDurationStatistics *)uploadDurationStatistics;

/** The CPU timeline duration statistics of each render group, in descending order by duration. */
@property (nonatomic, readonly, nonnull, copy) NSArray<MBMGroupPerformanceStatistics *> *topRenderGroups;

/** The CPU timeline duration statistics of each layer, in descending order by duration. */
@property (nonatomic, readonly, nonnull, copy) NSArray<MBMGroupPerformanceStatistics *> *topRenderLayers;

/** The CPU timeline duration of the shadowmap render pass. */
@property (nonatomic, readonly, nonnull) MBMDurationStatistics *shadowMapDurationStatistics;

/** The CPU timeline duration of the renderer's resource (buffers, textures, images) upload pass. */
@property (nonatomic, readonly, nonnull) MBMDurationStatistics *uploadDurationStatistics;


@end
