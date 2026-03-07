// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(ImportPosition)
__attribute__((visibility ("default")))
@interface MBMImportPosition : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithAbove:(nullable NSString *)above
                                below:(nullable NSString *)below
                                   at:(nullable NSNumber *)at NS_REFINED_FOR_SWIFT;

/** Import should be positioned above specified import id. */
@property (nonatomic, readonly, nullable, copy) NSString *above;

/** Import should be positioned below specified import id. */
@property (nonatomic, readonly, nullable, copy) NSString *below;

/** Import should be positioned at specified index in an imports stack. */
@property (nonatomic, readonly, nullable) NSNumber *at NS_REFINED_FOR_SWIFT;


@end
