// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
@class MBXDataRef;
@class MBXExpected<__covariant Value, __covariant Error>;

@class MBMMap;
@class MBMMapPlayerOptions;
@class MBMMapRecorderOptions;

/**
 * MapRecorder provides functions to record and replay API calls of a Map instance.
 * These recordings can be used to debug issues which requie multiple steps to reproduce.
 * Additionaly, playbacks can be used for performance testing custom scenarios.
 *
 * Note: The file format produced by MapRecorder is experimental and there is no guarantee for version cross-compatibility.
 * The set of recorded APIs and their paramters might change in future releases.
 *
 */
NS_SWIFT_NAME(MapRecorder)
__attribute__((visibility ("default")))
@interface MBMMapRecorder : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

/**
 * Stops the current recording session.
 *
 * @return a data reference which contains the recorded sequence as a gzip compressed JSON string.
 */
- (nonnull MBXDataRef *)stopRecording __attribute((ns_returns_retained));
/** Temporarily pauses or resumes playback if already paused. */
- (void)togglePauseReplay;
/** Returns the string description of the current state of playback. */
- (nonnull NSString *)getPlaybackState __attribute((ns_returns_retained));

@end
