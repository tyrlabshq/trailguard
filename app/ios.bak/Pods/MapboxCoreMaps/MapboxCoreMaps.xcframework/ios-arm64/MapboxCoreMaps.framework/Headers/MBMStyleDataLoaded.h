// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMStyleDataLoadedType.h>

@class MBMEventTimeInterval;

/**
 * The style data has been loaded. The event will be emitted once for each `StyleDataLoadedType`
 * type during style loading. If a new style is set, events will be emitted again for the newly set style.
 *
 * Note: The event may be emitted synchronously, for example, when `setStyleJSON`
 * is used to load style.
 */
NS_SWIFT_NAME(StyleDataLoaded)
__attribute__((visibility ("default")))
@interface MBMStyleDataLoaded : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithType:(MBMStyleDataLoadedType)type
                        timeInterval:(nonnull MBMEventTimeInterval *)timeInterval;

/** The type of loaded style data. */
@property (nonatomic, readonly) MBMStyleDataLoadedType type;

/**  The `timeInterval.begin` is when style data begins loading, and the `timeInterval.end` is when style data is loaded. */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
