// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

NS_SWIFT_NAME(MapPlayerOptions)
__attribute__((visibility ("default")))
@interface MBMMapPlayerOptions : NSObject

- (nonnull instancetype)init;

- (nonnull instancetype)initWithPlaybackCount:(int32_t)playbackCount
                      playbackSpeedMultiplier:(double)playbackSpeedMultiplier
                          avoidPlaybackPauses:(BOOL)avoidPlaybackPauses;

/** The number of times the sequence is played. If negative, the playback loops indefinitely. */
@property (nonatomic, readonly) int32_t playbackCount;

/** Multiplies the speed of playback for faster or slower replays. (1 means no change.) */
@property (nonatomic, readonly) double playbackSpeedMultiplier;

/**
 * When set to true, the player will try to interpolate actions between short wait actions,
 * to continously render during the playback.
 * This can help to maintain a consistent load during performance testing.
 */
@property (nonatomic, readonly) BOOL avoidPlaybackPauses;


@end
