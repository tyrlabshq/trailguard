// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMMapLoadingErrorType.h>

@class MBMCanonicalTileID;

/**
 * Describes an error that has occurred while loading the `map`. The `type` property
 * defines what resource could not be loaded, and the `message` property will contain
 * a descriptive error message.
 *
 * - In case of `MapLoadingErrorType.Source` or `MapLoadingErrorType.Tile` loading errors,
 * the `sourceId` property will contain the source's name. For the GeoJSON data loading and parsing errors,
 * `message` will contain the following JSON string: {"dataId": "dataId", "message": "errorMessage" }
 * - In case of `MapLoadingErrorType.Tile` loading errors, `tileId` will contain the `CanonicalTileID` of the tile.
 */
NS_SWIFT_NAME(MapLoadingError)
__attribute__((visibility ("default")))
@interface MBMMapLoadingError : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithType:(MBMMapLoadingErrorType)type
                             message:(nonnull NSString *)message
                            sourceId:(nullable NSString *)sourceId
                              tileId:(nullable MBMCanonicalTileID *)tileId
                           timestamp:(nonnull NSDate *)timestamp;

/** The type of an error. */
@property (nonatomic, readonly) MBMMapLoadingErrorType type;

/** Descriptive error message. */
@property (nonatomic, readonly, nonnull, copy) NSString *message;

/**
 * Identifier of a source.
 * Non-null when the type is `MapLoadingErrorType.Source` or `MapLoadingErrorType.Tile`.
 */
@property (nonatomic, readonly, nullable, copy) NSString *sourceId;

/**
 * The canonical tile id of a tile.
 * Non-null when the type is `MapLoadingErrorType.Tile`.
 */
@property (nonatomic, readonly, nullable) MBMCanonicalTileID *tileId;

/** The timestamp of the `MapLoadingError` event. */
@property (nonatomic, readonly, nonnull) NSDate *timestamp;


@end
