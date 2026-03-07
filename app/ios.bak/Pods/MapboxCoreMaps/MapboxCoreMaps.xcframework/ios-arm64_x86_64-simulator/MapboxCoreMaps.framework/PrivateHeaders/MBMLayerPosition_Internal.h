// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(__LayerPosition)
__attribute__((visibility ("default")))
@interface MBMLayerPosition : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithAbove:(nullable NSString *)above
                                below:(nullable NSString *)below
                                   at:(nullable NSNumber *)at;

@property (nonatomic, readonly, nullable, copy) NSString *above;
@property (nonatomic, readonly, nullable, copy) NSString *below;
@property (nonatomic, readonly, nullable) NSNumber *at;

@end
