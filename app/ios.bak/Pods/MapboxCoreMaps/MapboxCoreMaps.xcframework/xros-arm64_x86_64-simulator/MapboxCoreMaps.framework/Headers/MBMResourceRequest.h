// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMRequestDataSourceType.h>

@class MBMEventTimeInterval;
@class MBMRequestInfo;
@class MBMResponseInfo;

/** The `ResourceRequest` event allows the application to observe resource requests made by a `map` or `map snapshotter` object. */
NS_SWIFT_NAME(ResourceRequest)
__attribute__((visibility ("default")))
@interface MBMResourceRequest : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSource:(MBMRequestDataSourceType)source
                               request:(nonnull MBMRequestInfo *)request
                              response:(nullable MBMResponseInfo *)response
                             cancelled:(BOOL)cancelled
                          timeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/** The type of data source from which the resource is requested. */
@property (nonatomic, readonly) MBMRequestDataSourceType source;

/** The structure describes information about the resource request. */
@property (nonatomic, readonly, nonnull) MBMRequestInfo *request;

/** The structure describes information about the response to the resource request. */
@property (nonatomic, readonly, nullable) MBMResponseInfo *response;

/**
 * The property indicates whether the request was canceled. For instance, the
 * `map` requests a tile, and the location quickly changes so that the requested
 * tile is no longer needed.
 */
@property (nonatomic, readonly) BOOL cancelled;

/**
 * The timestamps of the resource request event. The `timeInterval.begin` is when
 * the resource request is made, and the `timeInterval.end` is when the request is completed.
 */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
