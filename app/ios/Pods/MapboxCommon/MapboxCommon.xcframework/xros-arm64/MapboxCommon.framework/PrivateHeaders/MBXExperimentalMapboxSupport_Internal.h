// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
@class MBXDataRef;
@class MBXExpected<__covariant Value, __covariant Error>;

NS_SWIFT_NAME(__MapboxSupport)
__attribute__((visibility ("default")))
@interface MBXExperimentalMapboxSupport : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull MBXExpected<MBXDataRef *, NSString *> *)getSupportPackageData __attribute((ns_returns_retained))
__attribute__((swift_name("getSupportPackageData()")));
+ (nonnull MBXExpected<NSNull *, NSString *> *)saveSupportPackageToFileForFileName:(nonnull NSString *)fileName __attribute((ns_returns_retained))
__attribute__((swift_name("saveSupportPackageToFile(fileName:)")));

@end
