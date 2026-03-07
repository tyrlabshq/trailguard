// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the type of loaded style data. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMStyleDataLoadedType)
{
    /**
     * The style document is loaded and parsed. Style properties can be read and
     * modified, and style layers and sources can be added or removed before rendering is started.
     */
    MBMStyleDataLoadedTypeStyle,
    /** Style's sprite sheet is loaded, and adding or updating images is possible. */
    MBMStyleDataLoadedTypeSprite,
    /** All sources defined by the style are loaded, and their properties can be read and updated if needed. */
    MBMStyleDataLoadedTypeSources
} NS_SWIFT_NAME(StyleDataLoadedType);

NSString* MBMStyleDataLoadedTypeToString(MBMStyleDataLoadedType style_data_loaded_type);
