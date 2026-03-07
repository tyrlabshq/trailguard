// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the type of data source. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRequestDataSourceType)
{
    /** The resource is requested from the asset management subsystem. */
    MBMRequestDataSourceTypeAsset,
    /** The resource is requested from the database. */
    MBMRequestDataSourceTypeDatabase,
    /** The resource is requested from the file system. */
    MBMRequestDataSourceTypeFileSystem,
    /** The resource is requested from the network. */
    MBMRequestDataSourceTypeNetwork,
    /**
     * The resource is requested from the main resource loader.
     * The main resource loader will delegate the request to the best-matched data source.
     */
    MBMRequestDataSourceTypeResourceLoader
} NS_SWIFT_NAME(RequestDataSourceType);

NSString* MBMRequestDataSourceTypeToString(MBMRequestDataSourceType request_data_source_type);
