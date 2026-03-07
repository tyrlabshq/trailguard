// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * The source has been removed with `removeStyleSource` method.
 *
 * Note: The event is emitted synchronously; thus, `getStyleSources` will be in
 * sync when the `observer` receives the notification.
 */
NS_SWIFT_NAME(SourceRemoved)
__attribute__((visibility ("default")))
@interface MBMSourceRemoved : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSourceId:(nonnull NSString *)sourceId
                               timestamp:(nonnull NSDate *)timestamp;

/** The source identifier of removed source. */
@property (nonatomic, readonly, nonnull, copy) NSString *sourceId;

/** The timestamp of source removal. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
