// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMTracingBackendType_Internal.h>

NS_SWIFT_NAME(Tracing)
__attribute__((visibility ("default")))
__attribute__((deprecated("Use API from Common Library")))
@interface MBMTracing : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (void)setTracingBackendTypeForType:(MBMTracingBackendType)type;
+ (MBMTracingBackendType)getTracingBackendType;

@end
