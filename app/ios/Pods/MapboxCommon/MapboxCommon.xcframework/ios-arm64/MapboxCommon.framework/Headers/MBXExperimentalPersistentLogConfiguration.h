// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXLoggingLevel.h>

/** Settings to configure behavior of persistent log */
NS_SWIFT_NAME(PersistentLogConfiguration)
__attribute__((visibility ("default")))
@interface MBXExperimentalPersistentLogConfiguration : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

/**
 * Set file logging level.
 *
 * @param upTo Log messages with lower severity than this parameter will be filtered out. If
 *             the parameter is empty, all log messages are filtered out, i.e., logging to file is disabled.
 * Default is unset, meaning logging to file is disabled.
 */
+ (void)setFileLoggingLevelForUpTo:(nullable NSNumber *)upTo;
/**
 * Set the folder path for file logs.
 *
 * @param path String path to the folder for storing the logs.
 * Default is "/Logs/mapbox.log" in application data path
 */
+ (void)setFilePathForPath:(nonnull NSString *)path;
/**
 * Get the folder path for file logs.
 *
 * @return String  path to the folder for the stored logs.
 */
+ (nonnull NSString *)getFilePath __attribute((ns_returns_retained));
/**
 * Enable an individual file per log category.
 *
 * @param allow Boolean true or false
 * Default is true.
 */
+ (void)setFilePerCategoryForAllow:(BOOL)allow;
/**
 * Get whether individual file per log category is enabled.
 *
 * @return Boolean true or false
 * Default is false.
 */
+ (BOOL)getFilePerCategory;
/**
 * Set maximum file size for stored logs.
 *
 * @param maxSize Maximum file size in bytes.
 * Default is 10 MB
 */
+ (void)setFileMaxSizeForMaxSize:(uint64_t)maxSize;
/**
 * Get maximum file size for stored logs.
 *
 * @return uint64 Maximum file size in bytes.
 */
+ (uint64_t)getFileMaxSize;
/**
 * Set file rotation count.
 *
 * @param rotateCount The amount of files to rotate through.
 * Note: each file will have a max size set by setFileMaxSize
 * Default is 2
 */
+ (void)setFileRotateCountForRotateCount:(uint64_t)rotateCount;
/**
 * Get file rotation count.
 *
 * @return uint64 The amount of files to rotate through.
 */
+ (uint64_t)getFileRotateCount;
/**
 * Set file allow header.
 *
 * @param allow Boolean to allow or disallow setting a file header.
 * Default is true
 */
+ (void)setFileAllowHeaderForAllow:(BOOL)allow;
/**
 * Get file allow header.
 *
 * @return Boolean indicating whether setting a file header is allowed.
 */
+ (BOOL)getFileAllowHeader;
/**
 * Set file flush configuration.
 *
 * @param logLines Optional. Amount of lines to store in memory before writing.
 * @param seconds Optional. Seconds between writing to file.
 * @param bufferSize Optional. Size of buffer before writing to file.
 * @param immediateFlushFromLogLevel Optional. Log level that should be flushed to file immediately.
 * Default for all of these is unset, meaning immediate writing to logfile
 */
+ (void)setFileFlushConfigForLogLines:(nullable NSNumber *)logLines
                              seconds:(nullable NSNumber *)seconds
                           bufferSize:(nullable NSNumber *)bufferSize
           immediateFlushFromLogLevel:(nullable NSNumber *)immediateFlushFromLogLevel;
/**
 * Get file flush log lines setting.
 *
 * @return Optional. Amount of lines to store in memory before writing or nullopt if not set.
 */
+ (nullable NSNumber *)getFileFlushLines __attribute((ns_returns_retained));
/**
 * Get file flush configuration.
 *
 * @return Optional. Amount of seconds to wait before writing logs to file or nullopt if not set.
 */
+ (nullable NSNumber *)getFileFlushSeconds __attribute((ns_returns_retained));
/**
 * Get file flush buffer size setting.
 *
 * @return Optional. Size in bytes buffer can reach before writing or nullopt if not set.
 */
+ (nullable NSNumber *)getFileFlushBufferSize __attribute((ns_returns_retained));
/**
 * Get immediate flush from log level configuration.
 *
 * @return Optional. Minimum log level at which logs are immediately flushed to file, nullopt if not set.
 */
+ (nullable NSNumber *)getFileFlushImmediateFromLogLevel __attribute((ns_returns_retained));
/**
 * Get file logging level.
 *
 * @return LoggingLevel Level up to which entries are logged to disk
 */
+ (nullable NSNumber *)getFileLoggingLevel __attribute((ns_returns_retained));
/**
 * Set file logging level for a category of logs.
 *
 * @param category Log category to be logged to disk
 * @param upTo Log messages with lower severity than this parameter will be filtered out. If
 *             the parameter is empty, all log messages are filtered out, i.e., logging to file is disabled.
 * Default is unset, meaning it follows the general FileLoggingLevel setting
 */
+ (void)setFileLoggingLevelForCategoryForCategory:(nonnull NSString *)category
                                             upTo:(nullable NSNumber *)upTo;
/**
 * Get file logging level for a category of logs.
 *
 * @param category Log category to be logged to disk
 * @return Optional with LoggingLevel up to which logs for the category are logged to disk
 */
+ (nullable NSNumber *)getFileLoggingLevelForCategoryForCategory:(nonnull NSString *)category __attribute((ns_returns_retained));
/**
 * Reset file logging level for a category of logs.
 *
 * @param category Category for which to reset the logging level
 */
+ (void)resetFileLoggingLevelForCategoryForCategory:(nonnull NSString *)category;

@end
