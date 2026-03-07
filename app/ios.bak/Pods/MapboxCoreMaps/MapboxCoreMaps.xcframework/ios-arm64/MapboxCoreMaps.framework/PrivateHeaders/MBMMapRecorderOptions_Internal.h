// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(MapRecorderOptions)
__attribute__((visibility ("default")))
@interface MBMMapRecorderOptions : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithTimeWindow:(nullable NSNumber *)timeWindow;

- (nonnull instancetype)initWithTimeWindow:(nullable NSNumber *)timeWindow
                            loggingEnabled:(BOOL)loggingEnabled
                                compressed:(BOOL)compressed;

/**
 * The maximum duration from the current time until API calls are kept.
 * If not specified, all API calls will be kept during the recording,
 * which can lead to significant memory consumption for long sessions.
 */
@property (nonatomic, readonly, nullable) NSNumber *timeWindow NS_REFINED_FOR_SWIFT;

/** If set to true, the recorded API calls will be printed in the logs. */
@property (nonatomic, readonly) BOOL loggingEnabled;

/** If set to true, the recorded output will be compressed with gzip. */
@property (nonatomic, readonly) BOOL compressed;


@end
