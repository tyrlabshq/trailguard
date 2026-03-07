// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMStyleManagerCallback_Internal.h>
#import <MapboxCoreMaps/MBMStyleManagerErrorCallback_Internal.h>

NS_SWIFT_NAME(RuntimeStylingOptions)
__attribute__((visibility ("default")))
@interface MBMRuntimeStylingOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSourcesCallback:(nullable MBMStyleManagerCallback)sourcesCallback
                                 layersCallback:(nullable MBMStyleManagerCallback)layersCallback
                                 imagesCallback:(nullable MBMStyleManagerCallback)imagesCallback
                              completedCallback:(nullable MBMStyleManagerCallback)completedCallback
                               canceledCallback:(nullable MBMStyleManagerCallback)canceledCallback
                                  errorCallback:(nullable MBMStyleManagerErrorCallback)errorCallback;

@property (nonatomic, readonly, nullable) MBMStyleManagerCallback sourcesCallback;
@property (nonatomic, readonly, nullable) MBMStyleManagerCallback layersCallback;
@property (nonatomic, readonly, nullable) MBMStyleManagerCallback imagesCallback;
@property (nonatomic, readonly, nullable) MBMStyleManagerCallback completedCallback;
@property (nonatomic, readonly, nullable) MBMStyleManagerCallback canceledCallback;
@property (nonatomic, readonly, nullable) MBMStyleManagerErrorCallback errorCallback;

@end
