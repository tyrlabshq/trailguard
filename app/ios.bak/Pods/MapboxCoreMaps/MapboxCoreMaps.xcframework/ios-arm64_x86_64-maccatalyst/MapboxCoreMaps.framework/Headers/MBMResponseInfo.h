// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMResponseSourceType.h>

@class MBMResourceRequestError;

/** The structure defines the information about the response for the resource request. */
NS_SWIFT_NAME(ResponseInfo)
__attribute__((visibility ("default")))
@interface MBMResponseInfo : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithNoContent:(BOOL)noContent
                              notModified:(BOOL)notModified
                           mustRevalidate:(BOOL)mustRevalidate
                                   source:(MBMResponseSourceType)source
                                     size:(uint64_t)size
                                 modified:(nullable NSDate *)modified
                                  expires:(nullable NSDate *)expires
                                     etag:(nullable NSString *)etag
                                    error:(nullable MBMResourceRequestError *)error;

/** The response has no content. */
@property (nonatomic, readonly) BOOL noContent;

/** The requested resource hasn't changed since the last time it was accessed. */
@property (nonatomic, readonly) BOOL notModified;

/** The requested resource is invalidated on the server, and `map` must re-validate the resource. */
@property (nonatomic, readonly) BOOL mustRevalidate;

/** The data source that provided the response data. */
@property (nonatomic, readonly) MBMResponseSourceType source;

/** The size of the requested resource in bytes. */
@property (nonatomic, readonly) uint64_t size;

/** The timestamp of the last modification of the resource. */
@property (nonatomic, readonly, nullable) NSDate *modified;

/** The timestamp for the time when a resource is considered to be expired. */
@property (nonatomic, readonly, nullable) NSDate *expires;

/** The cache control identifier that defines the version of a resource. */
@property (nonatomic, readonly, nullable, copy) NSString *etag;

/** The optional structure that would be present if an error occurs. */
@property (nonatomic, readonly, nullable) MBMResourceRequestError *error;


@end
