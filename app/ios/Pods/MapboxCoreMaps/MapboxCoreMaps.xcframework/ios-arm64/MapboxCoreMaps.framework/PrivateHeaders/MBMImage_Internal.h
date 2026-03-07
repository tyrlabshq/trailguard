// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
@class MBXDataRef;

NS_SWIFT_NAME(__Image)
__attribute__((visibility ("default")))
@interface MBMImage : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithWidth:(uint32_t)width
                               height:(uint32_t)height
                                 data:(nonnull MBXDataRef *)data;

@property (nonatomic, readonly) uint32_t width;
@property (nonatomic, readonly) uint32_t height;
@property (nonatomic, readonly, nonnull) MBXDataRef *data;

@end
