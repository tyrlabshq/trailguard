// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the source type that provides the requested resource. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMResponseSourceType)
{
    /** The source of the response is a network. */
    MBMResponseSourceTypeNetwork,
    /** The source of the response is a cache (database, in-memory caches). */
    MBMResponseSourceTypeCache,
    /** The source of the response is the TileStore. */
    MBMResponseSourceTypeTileStore,
    /**
     * The source of the response is the local filesystem. This type is used for
     * responses from the `Asset` and `FileSystem` data source types.
     */
    MBMResponseSourceTypeLocalFile
} NS_SWIFT_NAME(ResponseSourceType);

NSString* MBMResponseSourceTypeToString(MBMResponseSourceType response_source_type);
