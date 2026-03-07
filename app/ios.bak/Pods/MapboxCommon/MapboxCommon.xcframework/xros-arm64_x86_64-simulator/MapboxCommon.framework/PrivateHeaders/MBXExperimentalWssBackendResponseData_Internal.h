// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@protocol MBXReadStream;

NS_SWIFT_NAME(ResponseData)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssBackendResponseData : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithHeaders:(nonnull NSDictionary<NSString *, NSString *> *)headers
                                   code:(int32_t)code
                             dataStream:(nonnull id<MBXReadStream>)dataStream;

/** Response headers in a format header name:value. All the header names are in lower case format. */
@property (nonatomic, readonly, nonnull, copy) NSDictionary<NSString *, NSString *> *headers;

/** Response code. */
@property (nonatomic, readonly) int32_t code;

@property (nonatomic, readonly, nonnull) id<MBXReadStream> dataStream;

@end
