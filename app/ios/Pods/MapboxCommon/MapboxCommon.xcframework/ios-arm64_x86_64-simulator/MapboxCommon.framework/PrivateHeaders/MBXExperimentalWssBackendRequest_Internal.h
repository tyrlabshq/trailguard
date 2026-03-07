// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXNetworkRestriction.h>

NS_SWIFT_NAME(Request)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssBackendRequest : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithUrl:(nonnull NSString *)url
                            headers:(nonnull NSDictionary<NSString *, NSString *> *)headers;

- (nonnull instancetype)initWithUrl:(nonnull NSString *)url
                            headers:(nonnull NSDictionary<NSString *, NSString *> *)headers
                            timeout:(uint64_t)timeout
                 networkRestriction:(MBXNetworkRestriction)networkRestriction
                              flags:(uint32_t)flags;

/** WSS request url. */
@property (nonatomic, readonly, nonnull, copy) NSString *url;

/** WSS request headers. */
@property (nonatomic, readwrite, nonnull, copy) NSDictionary<NSString *, NSString *> *headers;

/** Connection timeout. */
@property (nonatomic, readonly) uint64_t timeout;

/** See HttpRequest for details. */
@property (nonatomic, readonly) MBXNetworkRestriction networkRestriction;

/** See HttpRequest for details. */
@property (nonatomic, readonly) uint32_t flags;


@end
