// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXTracingBackendType_Internal.h>

NS_SWIFT_NAME(Tracing)
__attribute__((visibility ("default")))
@interface MBXTracing : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (void)setTracingBackendTypeForType:(MBXTracingBackendType)type;
+ (MBXTracingBackendType)getTracingBackendType;

@end
