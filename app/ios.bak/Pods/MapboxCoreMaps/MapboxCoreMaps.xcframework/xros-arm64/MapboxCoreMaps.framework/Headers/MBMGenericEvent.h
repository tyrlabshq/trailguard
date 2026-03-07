// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMEventTimeInterval;

/** The generic event type. */
NS_SWIFT_NAME(GenericEvent)
__attribute__((visibility ("default")))
@interface MBMGenericEvent : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithName:(nonnull NSString *)name
                                data:(nonnull id)data
                        timeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/** The name of the event. */
@property (nonatomic, readonly, nonnull, copy) NSString *name;

@property (nonatomic, readonly, nonnull, copy) id data;
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;

@end
