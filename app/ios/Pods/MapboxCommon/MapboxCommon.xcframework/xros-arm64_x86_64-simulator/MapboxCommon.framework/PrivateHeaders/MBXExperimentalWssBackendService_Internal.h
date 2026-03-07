// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXResultCallback_Internal.h>

@class MBXExperimentalWssBackendData;
@class MBXExperimentalWssBackendRequest;
@protocol MBXExperimentalWssBackendRequestObserver;

NS_SWIFT_NAME(Service)
@protocol MBXExperimentalWssBackendService
/** Set ping timeout to use for all newly created sessions. */
- (void)setPingTimeoutForPingTimeout:(NSTimeInterval)pingTimeout;
- (uint64_t)connectForRequest:(nonnull MBXExperimentalWssBackendRequest *)request
                     observer:(nonnull id<MBXExperimentalWssBackendRequestObserver>)observer;
- (void)cancelConnectionForId:(uint64_t)id_
                     callback:(nonnull MBXResultCallback)callback;
- (void)writeForId:(uint64_t)id_
              data:(nonnull MBXExperimentalWssBackendData *)data;
@end
