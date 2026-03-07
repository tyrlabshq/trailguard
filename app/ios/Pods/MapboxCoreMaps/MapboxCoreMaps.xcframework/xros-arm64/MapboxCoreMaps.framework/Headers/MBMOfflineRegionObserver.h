// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMOfflineRegionError;
@class MBMOfflineRegionStatus;

/**
 * A region can have a single observer, which gets notified whenever a change
 * to the region's status occurs.
 */
NS_SWIFT_NAME(OfflineRegionObserver)
__attribute__((deprecated))
@protocol MBMOfflineRegionObserver
/**
 * Implement this method to be notified of a change in the status of an
 * offline region. Status changes include any change in state of the members
 * of `offline region status`.
 */
- (void)statusChangedForStatus:(nonnull MBMOfflineRegionStatus *)status;
/**
 * Implement this method to be notified of errors encountered while downloading
 * regional resources. Such errors may be recoverable; for example the implementation
 * will attempt to re-request failed resources based on an exponential backoff
 * algorithm, or when it detects that network access has been restored.
 */
- (void)errorOccurredForError:(nonnull MBMOfflineRegionError *)error;
@end
