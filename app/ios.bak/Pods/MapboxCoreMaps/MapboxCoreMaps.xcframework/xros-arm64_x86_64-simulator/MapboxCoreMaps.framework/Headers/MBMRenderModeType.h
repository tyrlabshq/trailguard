// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** The enumeration defines the rendering mode for the rendered frame. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMRenderModeType)
{
    /** The `map` rendered the frame with partially available data. */
    MBMRenderModeTypePartial,
    /** The `map` rendered the frame with all the required data. */
    MBMRenderModeTypeFull
} NS_SWIFT_NAME(RenderModeType);

NSString* MBMRenderModeTypeToString(MBMRenderModeType render_mode_type);
