// This file is generated and will be overwritten automatically.

#import <MapboxCoreMaps/MBMMapRecorder.h>
#import <MapboxCoreMaps/MBMPlaybackFinished_Internal.h>

@interface MBMMapRecorder ()
+ (nonnull MBXExpected<MBMMapRecorder *, NSString *> *)createInstanceForMap:(nonnull MBMMap *)map __attribute((ns_returns_retained));
- (void)startRecordingForOptions:(nonnull MBMMapRecorderOptions *)options;
- (void)replayForContent:(nonnull MBXDataRef *)content
                 options:(nonnull MBMMapPlayerOptions *)options
                callback:(nonnull MBMPlaybackFinished)callback;
@end
