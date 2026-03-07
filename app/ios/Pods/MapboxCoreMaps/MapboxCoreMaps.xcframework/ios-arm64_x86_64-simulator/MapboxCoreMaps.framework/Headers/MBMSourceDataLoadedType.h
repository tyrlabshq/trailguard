// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the type of loaded source data. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMSourceDataLoadedType)
{
    /**
     * The metadata of a source. For example, TileJSON for a vector source or a
     * GeoJSON document for a GeoJSON source.
     */
    MBMSourceDataLoadedTypeMetadata,
    /** The tile data of a source. */
    MBMSourceDataLoadedTypeTile
} NS_SWIFT_NAME(SourceDataLoadedType);

NSString* MBMSourceDataLoadedTypeToString(MBMSourceDataLoadedType source_data_loaded_type);
