// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/**
 * The time interval of an event. The `begin` property represents the time
 * origin of an event, and the `end` property represents the time when the particular
 * operation is complete. The timestamps are sampled at the origin and do not include
 * the time required to dispatch an event.
 */
NS_SWIFT_NAME(EventTimeInterval)
__attribute__((visibility ("default")))
@interface MBMEventTimeInterval : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithBegin:(nonnull NSDate *)begin
                                  end:(nonnull NSDate *)end;

/** The timestamp at which the event begins. */
@property (nonatomic, readonly, nonnull) NSDate *begin;

/** The timestamp at which the event ends. */
@property (nonatomic, readonly, nonnull) NSDate *end;


@end
