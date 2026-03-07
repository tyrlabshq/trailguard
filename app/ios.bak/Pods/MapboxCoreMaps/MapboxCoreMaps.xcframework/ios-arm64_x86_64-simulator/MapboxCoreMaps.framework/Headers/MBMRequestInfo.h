// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMRequestLoadingMethodType.h>
#import <MapboxCoreMaps/MBMRequestPriorityType.h>
#import <MapboxCoreMaps/MBMRequestResourceType.h>

/** The structure defines the information about the resource request. */
NS_SWIFT_NAME(RequestInfo)
__attribute__((visibility ("default")))
@interface MBMRequestInfo : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithUrl:(nonnull NSString *)url
                           resource:(MBMRequestResourceType)resource
                           priority:(MBMRequestPriorityType)priority
                      loadingMethod:(nonnull NSArray<NSNumber *> *)loadingMethod;

/** The URL of a requested resource. */
@property (nonatomic, readonly, nonnull, copy) NSString *url;

/** The type of a requested resource. */
@property (nonatomic, readonly) MBMRequestResourceType resource;

/** The priority of a resource request. */
@property (nonatomic, readonly) MBMRequestPriorityType priority;

/** The loading methods for the resource request. */
@property (nonatomic, readonly, nonnull, copy) NSArray<NSNumber *> *loadingMethod NS_REFINED_FOR_SWIFT;


@end
