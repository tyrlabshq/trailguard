// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBXTracingBackendType)
{
    /**
     * The `Noop` backend introduces no overhead and does not produce any trace marks.
     * The `Noop` backend is used by default, and the enumeration value can be used to
     * disable tracing if needed.
     */
    MBXTracingBackendTypeNoop,
    /**
     * Tracing backend specific to the operating system.
     * For example, Signpost for the iOS or Android Trace for the Android platform.
     */
    MBXTracingBackendTypePlatform,
    /** Tracing backend that prints Perfetto-compatible trace marks to the platform log subsystem. */
    MBXTracingBackendTypeLogger
} NS_SWIFT_NAME(TracingBackendType);

NSString* MBXTracingBackendTypeToString(MBXTracingBackendType tracing_backend_type);
