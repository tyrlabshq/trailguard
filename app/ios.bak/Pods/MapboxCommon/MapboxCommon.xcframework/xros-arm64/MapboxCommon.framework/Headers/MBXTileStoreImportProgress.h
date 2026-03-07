// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Describes the progress of a tile store import operation. */
NS_SWIFT_NAME(TileStoreImportProgress)
__attribute__((visibility ("default")))
@interface MBXTileStoreImportProgress : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithStartTime:(uint64_t)startTime
                     erroredResourceCount:(uint64_t)erroredResourceCount
                     skippedResourceCount:(uint64_t)skippedResourceCount
                    importedResourceCount:(uint64_t)importedResourceCount
                     importedResourceSize:(uint64_t)importedResourceSize
                    requiredResourceCount:(uint64_t)requiredResourceCount
                    requiredResourceBytes:(uint64_t)requiredResourceBytes;

/** Get progression rate in bytes processed per second. */
- (double)getProgressRate;

/** The start time of import, in milliseconds since epoch (January 1, 1970). */
@property (nonatomic, readonly) uint64_t startTime NS_REFINED_FOR_SWIFT;

/** The number of resources that have failed to import due to an error. */
@property (nonatomic, readonly) uint64_t erroredResourceCount;

/** The number of resources that have not been imported due to already existing in the cache. */
@property (nonatomic, readonly) uint64_t skippedResourceCount;

/** The number of resources that are ready for offline use and have been imported from the archive. */
@property (nonatomic, readonly) uint64_t importedResourceCount;

/** The cumulative size, in bytes, of all resources (inclusive of tiles) that have been imported from the archive. */
@property (nonatomic, readonly) uint64_t importedResourceSize;

/** The total number of resources in the archive. */
@property (nonatomic, readonly) uint64_t requiredResourceCount;

/** The total number of bytes in the archive. */
@property (nonatomic, readonly) uint64_t requiredResourceBytes;


@end
