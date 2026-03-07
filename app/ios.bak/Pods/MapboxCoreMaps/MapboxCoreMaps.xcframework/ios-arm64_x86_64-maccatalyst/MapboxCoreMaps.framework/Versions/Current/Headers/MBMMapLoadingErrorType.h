// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines map loading errors. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMMapLoadingErrorType)
{
    /** The style resource failed to load. */
    MBMMapLoadingErrorTypeStyle,
    /** The style resource failed to load. */
    MBMMapLoadingErrorTypeSprite,
    /** The style resource failed to load. */
    MBMMapLoadingErrorTypeSource,
    /** The glyph resource failed to load. */
    MBMMapLoadingErrorTypeGlyphs,
    /** The tile resource failed to load. */
    MBMMapLoadingErrorTypeTile
} NS_SWIFT_NAME(MapLoadingErrorType);

NSString* MBMMapLoadingErrorTypeToString(MBMMapLoadingErrorType map_loading_error_type);
