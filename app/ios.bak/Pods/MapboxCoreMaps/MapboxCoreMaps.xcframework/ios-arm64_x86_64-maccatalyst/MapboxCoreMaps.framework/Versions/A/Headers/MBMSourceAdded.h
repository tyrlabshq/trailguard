// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * The source has been added with `addStyleSource` method.
 *
 * Note: The event is emitted synchronously; therefore, it is possible to read
 * added source's properties immediately.
 */
NS_SWIFT_NAME(SourceAdded)
__attribute__((visibility ("default")))
@interface MBMSourceAdded : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSourceId:(nonnull NSString *)sourceId
                               timestamp:(nonnull NSDate *)timestamp;

/** The source identifier of added source. */
@property (nonatomic, readonly, nonnull, copy) NSString *sourceId;

/** The timestamp of source addition. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
