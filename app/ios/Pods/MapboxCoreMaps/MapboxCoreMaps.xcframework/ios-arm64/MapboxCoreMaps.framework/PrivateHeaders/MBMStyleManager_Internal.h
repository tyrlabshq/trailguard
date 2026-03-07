// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMAsyncOperationResultCallback_Internal.h>
@class MBXExpected<__covariant Value, __covariant Error>;
@class MBXFeature;
#import <MapboxCoreMaps/MBMObservable_Internal.h>

@class MBMCameraOptions;
@class MBMCanonicalTileID;
@class MBMColorTheme;
@class MBMCoordinateBounds;
@class MBMCustomGeometrySourceOptions;
@class MBMCustomRasterSourceOptions;
@class MBMCustomRasterSourceTileData;
@class MBMFeaturesetDescriptor;
@class MBMGeoJSONSourceData;
@class MBMImage;
@class MBMImageContent;
@class MBMImageStretches;
@class MBMImportPosition;
@class MBMLayerPosition;
@class MBMRuntimeStylingOptions;
@class MBMStyleObjectInfo;
@class MBMStylePropertyValue;
@class MBMTransitionOptions;
@protocol MBMCustomLayerHost;
@protocol MBXCancelable;

NS_SWIFT_NAME(StyleManager)
__attribute__((visibility ("default")))
@interface MBMStyleManager : MBMObservable

/**
 * Get the URI of the current style in use.
 *
 * @return A string containing a style URI.
 */
- (nonnull NSString *)getStyleURI __attribute((ns_returns_retained));
/**
 * Load style from provided URI.
 *
 * This is an asynchronous call. To check the result of this operation, `MapLoaded` or `MapLoadingError` events
 * should be observed. In case of successful style load, StyleLoaded event will be also emitted.
 *
 * @param uri URI where the style should be loaded from.
 */
- (void)setStyleURIForUri:(nonnull NSString *)uri;
- (void)setStyleURIForUri:(nonnull NSString *)uri
           stylingOptions:(nonnull MBMRuntimeStylingOptions *)stylingOptions;
/**
 * Get the JSON serialization string of the current style in use.
 *
 * @return A JSON string containing a serialized style.
 */
- (nonnull NSString *)getStyleJSON __attribute((ns_returns_retained));
/**
 * Load the style from a provided JSON string.
 *
 * @param json A JSON string containing a serialized style.
 */
- (void)setStyleJSONForJson:(nonnull NSString *)json;
- (void)setStyleJSONForJson:(nonnull NSString *)json
             stylingOptions:(nonnull MBMRuntimeStylingOptions *)stylingOptions;
/**
 * Load the style glyphs from a provided URL.
 *
 * @param url URL where the glyphs should be loaded from.
 */
- (void)setStyleGlyphURLForUrl:(nonnull NSString *)url;
/**
 * Get the glyph URL of the current style in use.
 *
 * @return A string containing a glyph URI.
 */
- (nonnull NSString *)getStyleGlyphURL __attribute((ns_returns_retained));
- (nonnull MBMCameraOptions *)getStyleDefaultCamera __attribute((ns_returns_retained));
/**
 * Returns the map style's transition options. By default, the style parser will attempt
 * to read the style default transition options, if any, fallbacking to an immediate transition
 * otherwise. Transition options can be overriden via `setStyleTransition`, but the options are
 * reset once a new style has been loaded.
 *
 * The style transition is re-evaluated when a new style is loaded.
 *
 * @return The `transition options` of the current style in use.
 */
- (nonnull MBMTransitionOptions *)getStyleTransition __attribute((ns_returns_retained));
/**
 * Overrides the map style's transition options with user-provided options.
 *
 * The style transition is re-evaluated when a new style is loaded.
 *
 * @param transitionOptions The `transition options`.
 */
- (void)setStyleTransitionForTransitionOptions:(nonnull MBMTransitionOptions *)transitionOptions;
/**
 * Returns the existing style imports.
 *
 * @return The list containing the information about existing style import objects.
 */
- (nonnull NSArray<MBMStyleObjectInfo *> *)getStyleImports __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleImportForImportId:(nonnull NSString *)importId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleImportFromURIForImportId:(nonnull NSString *)importId
                                                                            uri:(nonnull NSString *)uri
                                                                         config:(nullable NSDictionary<NSString *, id> *)config
                                                                 importPosition:(nullable MBMImportPosition *)importPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleImportFromJSONForImportId:(nonnull NSString *)importId
                                                                            json:(nonnull NSString *)json
                                                                          config:(nullable NSDictionary<NSString *, id> *)config
                                                                  importPosition:(nullable MBMImportPosition *)importPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)updateStyleImportWithURIForImportId:(nonnull NSString *)importId
                                                                               uri:(nonnull NSString *)uri
                                                                            config:(nullable NSDictionary<NSString *, id> *)config __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)updateStyleImportWithJSONForImportId:(nonnull NSString *)importId
                                                                               json:(nonnull NSString *)json
                                                                             config:(nullable NSDictionary<NSString *, id> *)config __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)moveStyleImportForImportId:(nonnull NSString *)importId
                                                           importPosition:(nullable MBMImportPosition *)importPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<id, NSString *> *)getStyleImportSchemaForImportId:(nonnull NSString *)importId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSDictionary<NSString *, MBMStylePropertyValue *> *, NSString *> *)getStyleImportConfigPropertiesForImportId:(nonnull NSString *)importId __attribute((ns_returns_retained));
- (nonnull MBXExpected<MBMStylePropertyValue *, NSString *> *)getStyleImportConfigPropertyForImportId:(nonnull NSString *)importId
                                                                                               config:(nonnull NSString *)config __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleImportConfigPropertiesForImportId:(nonnull NSString *)importId
                                                                                 configs:(nonnull NSDictionary<NSString *, id> *)configs __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleImportConfigPropertyForImportId:(nonnull NSString *)importId
                                                                                config:(nonnull NSString *)config
                                                                                 value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleColorThemeForColorTheme:(nullable MBMColorTheme *)colorTheme __attribute((ns_returns_retained));
- (void)setInitialStyleColorTheme;
- (nonnull MBXExpected<NSNull *, NSString *> *)setImportColorThemeForImportId:(nonnull NSString *)importId
                                                                   colorTheme:(nullable MBMColorTheme *)colorTheme __attribute((ns_returns_retained));
- (nonnull NSArray<MBMFeaturesetDescriptor *> *)getStyleFeaturesets __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleLayerForProperties:(nonnull id)properties
                                                            layerPosition:(nullable MBMLayerPosition *)layerPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleCustomLayerForLayerId:(nonnull NSString *)layerId
                                                                   layerHost:(nonnull id<MBMCustomLayerHost>)layerHost
                                                               layerPosition:(nullable MBMLayerPosition *)layerPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addPersistentStyleLayerForProperties:(nonnull id)properties
                                                                      layerPosition:(nullable MBMLayerPosition *)layerPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addPersistentStyleCustomLayerForLayerId:(nonnull NSString *)layerId
                                                                             layerHost:(nonnull id<MBMCustomLayerHost>)layerHost
                                                                         layerPosition:(nullable MBMLayerPosition *)layerPosition __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNumber *, NSString *> *)isStyleLayerPersistentForLayerId:(nonnull NSString *)layerId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleLayerForLayerId:(nonnull NSString *)layerId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)moveStyleLayerForLayerId:(nonnull NSString *)layerId
                                                          layerPosition:(nullable MBMLayerPosition *)layerPosition __attribute((ns_returns_retained));
/**
 * Checks whether a given style layer exists.
 *
 * @param layerId Style layer identifier.
 *
 * @return A `true` value if the given style layer exists, `false` otherwise.
 */
- (BOOL)styleLayerExistsForLayerId:(nonnull NSString *)layerId;
/**
 * Returns the existing style layers.
 *
 * @return The list containing the information about existing style layer objects.
 */
- (nonnull NSArray<MBMStyleObjectInfo *> *)getStyleLayers __attribute((ns_returns_retained));
/**
 * Returns slots available in the style and its imports.
 *
 * @return The list of slots identifiers.
 */
- (nonnull NSArray<NSString *> *)getStyleSlots __attribute((ns_returns_retained));
/**
 * Gets the value of style layer property.
 *
 * @param layerId A style layer identifier.
 * @param property The style layer property name.
 * @return The `style property value`.
 */
- (nonnull MBMStylePropertyValue *)getStyleLayerPropertyForLayerId:(nonnull NSString *)layerId
                                                          property:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleLayerPropertyForLayerId:(nonnull NSString *)layerId
                                                                      property:(nonnull NSString *)property
                                                                         value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull id<MBXCancelable>)setStyleLayerPropertyAsyncForLayerId:(nonnull NSString *)layerId
                                                         property:(nonnull NSString *)property
                                                            value:(nonnull id)value
                                                         callback:(nonnull MBMAsyncOperationResultCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
/**
 * Gets the default value of style layer property
 *
 * @param layerType A style [layer type](https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers).
 * @param property The style layer property name.
 * @return The default `style property value` for a given `layerType` and `property` name.
 */
+ (nonnull MBMStylePropertyValue *)getStyleLayerPropertyDefaultValueForLayerType:(nonnull NSString *)layerType
                                                                        property:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<id, NSString *> *)getStyleLayerPropertiesForLayerId:(nonnull NSString *)layerId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleLayerPropertiesForLayerId:(nonnull NSString *)layerId
                                                                      properties:(nonnull id)properties __attribute((ns_returns_retained));
- (nonnull id<MBXCancelable>)setStyleLayerPropertiesAsyncForLayerId:(nonnull NSString *)layerId
                                                         properties:(nonnull id)properties
                                                           callback:(nonnull MBMAsyncOperationResultCallback)callback __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleSourceForSourceId:(nonnull NSString *)sourceId
                                                              properties:(nonnull id)properties __attribute((ns_returns_retained));
/**
 * Gets the value of style source property.
 *
 * @param sourceId A style source identifier.
 * @param property The style source property name.
 * @return The value of a `property` in the source with a `sourceId`.
 */
- (nonnull MBMStylePropertyValue *)getStyleSourcePropertyForSourceId:(nonnull NSString *)sourceId
                                                            property:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleSourcePropertyForSourceId:(nonnull NSString *)sourceId
                                                                        property:(nonnull NSString *)property
                                                                           value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleSourcePropertyForImportId:(nonnull NSString *)importId
                                                                        sourceId:(nonnull NSString *)sourceId
                                                                        property:(nonnull NSString *)property
                                                                           value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<id, NSString *> *)getStyleSourcePropertiesForSourceId:(nonnull NSString *)sourceId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleSourcePropertiesForSourceId:(nonnull NSString *)sourceId
                                                                        properties:(nonnull id)properties __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleGeoJSONSourceDataForSourceId:(nonnull NSString *)sourceId
                                                                             dataId:(nonnull NSString *)dataId
                                                                               data:(nonnull MBMGeoJSONSourceData *)data __attribute((ns_returns_retained)) NS_REFINED_FOR_SWIFT;
- (nonnull MBXExpected<NSNull *, NSString *> *)addGeoJSONSourceFeaturesForSourceId:(nonnull NSString *)sourceId
                                                                            dataId:(nonnull NSString *)dataId
                                                                          features:(nonnull NSArray<MBXFeature *> *)features __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)updateGeoJSONSourceFeaturesForSourceId:(nonnull NSString *)sourceId
                                                                               dataId:(nonnull NSString *)dataId
                                                                             features:(nonnull NSArray<MBXFeature *> *)features __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeGeoJSONSourceFeaturesForSourceId:(nonnull NSString *)sourceId
                                                                               dataId:(nonnull NSString *)dataId
                                                                           featureIds:(nonnull NSArray<NSString *> *)featureIds __attribute((ns_returns_retained));
/**
 * Gets the default value of style source property.
 *
 * @param sourceType A style source type.
 * @param property The style source property name.
 * @return The default value of a `property` for the sources with of a `sourceType` type.
 */
+ (nonnull MBMStylePropertyValue *)getStyleSourcePropertyDefaultValueForSourceType:(nonnull NSString *)sourceType
                                                                          property:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)updateStyleImageSourceImageForSourceId:(nonnull NSString *)sourceId
                                                                                image:(nonnull MBMImage *)image __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleSourceForSourceId:(nonnull NSString *)sourceId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleSourceUncheckedForSourceId:(nonnull NSString *)sourceId __attribute((ns_returns_retained));
/**
 * Checks whether a given style source exists.
 *
 * @param sourceId A style source identifier.
 *
 * @return `true` if the given source exists, `false` otherwise.
 */
- (BOOL)styleSourceExistsForSourceId:(nonnull NSString *)sourceId;
/**
 * Returns the existing style sources.
 *
 * @return The list containing the information about existing style source objects.
 */
- (nonnull NSArray<MBMStyleObjectInfo *> *)getStyleSources __attribute((ns_returns_retained));
- (nonnull NSArray<MBMStyleObjectInfo *> *)getStyleLights __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleLightsForLights:(nonnull id)lights __attribute((ns_returns_retained));
- (nonnull MBMStylePropertyValue *)getStyleLightPropertyForId:(nonnull NSString *)id_
                                                     property:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleLightPropertyForId:(nonnull NSString *)id_
                                                                 property:(nonnull NSString *)property
                                                                    value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleAtmosphereForProperties:(nonnull id)properties __attribute((ns_returns_retained));
/**
 * Gets the value of a style atmosphere property.
 *
 * @param property The style atmosphere property name.
 * @return The style atmosphere property value.
 */
- (nonnull MBMStylePropertyValue *)getStyleAtmospherePropertyForProperty:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleSnowForProperties:(nonnull id)properties __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleSnowPropertyForProperty:(nonnull NSString *)property
                                                                         value:(nonnull id)value __attribute((ns_returns_retained));
/**
 * Experimental. Gets the value of a style snow property.
 *
 * @param property The style snow property name.
 * @return The style snow property value.
 */
- (nonnull MBMStylePropertyValue *)getStyleSnowPropertyForProperty:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleRainForProperties:(nonnull id)properties __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleRainPropertyForProperty:(nonnull NSString *)property
                                                                         value:(nonnull id)value __attribute((ns_returns_retained));
/**
 * Experimental. Gets the value of a style rain property.
 *
 * @param property The style rain property name.
 * @return The style rain property value.
 */
- (nonnull MBMStylePropertyValue *)getStyleRainPropertyForProperty:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleAtmospherePropertyForProperty:(nonnull NSString *)property
                                                                               value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleTerrainForProperties:(nonnull id)properties __attribute((ns_returns_retained));
/**
 * Gets the value of a style terrain property.
 *
 * @param property The style terrain property name.
 * @return The style terrain property value.
 */
- (nonnull MBMStylePropertyValue *)getStyleTerrainPropertyForProperty:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleTerrainPropertyForProperty:(nonnull NSString *)property
                                                                            value:(nonnull id)value __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleProjectionForProperties:(nonnull id)properties __attribute((ns_returns_retained));
/**
 * Gets the value of a style projection property.
 *
 * @param property The style projection property name.
 * @return The style projection property value.
 */
- (nonnull MBMStylePropertyValue *)getStyleProjectionPropertyForProperty:(nonnull NSString *)property __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleProjectionPropertyForProperty:(nonnull NSString *)property
                                                                               value:(nonnull id)value __attribute((ns_returns_retained));
- (nullable MBMImage *)getStyleImageForImageId:(nonnull NSString *)imageId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleImageForImageId:(nonnull NSString *)imageId
                                                                 scale:(float)scale
                                                                 image:(nonnull MBMImage *)image
                                                                   sdf:(BOOL)sdf
                                                              stretchX:(nonnull NSArray<MBMImageStretches *> *)stretchX
                                                              stretchY:(nonnull NSArray<MBMImageStretches *> *)stretchY
                                                               content:(nullable MBMImageContent *)content __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleImageForImageId:(nonnull NSString *)imageId __attribute((ns_returns_retained));
/**
 * Checks whether an image exists.
 *
 * @param imageId The identifier of the image.
 *
 * @return True if image exists, false otherwise.
 */
- (BOOL)hasStyleImageForImageId:(nonnull NSString *)imageId;
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleModelForModelId:(nonnull NSString *)modelId
                                                              modelUri:(nonnull NSString *)modelUri __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)removeStyleModelForModelId:(nonnull NSString *)modelId __attribute((ns_returns_retained));
/**
 * Checks whether a model exists.
 *
 * @param modelId The identifier of the model.
 *
 * @return True if model exists, false otherwise.
 */
- (BOOL)hasStyleModelForModelId:(nonnull NSString *)modelId;
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleCustomGeometrySourceForSourceId:(nonnull NSString *)sourceId
                                                                               options:(nonnull MBMCustomGeometrySourceOptions *)options __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleCustomGeometrySourceTileDataForSourceId:(nonnull NSString *)sourceId
                                                                                        tileId:(nonnull MBMCanonicalTileID *)tileId
                                                                             featureCollection:(nonnull NSArray<MBXFeature *> *)featureCollection __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)invalidateStyleCustomGeometrySourceTileForSourceId:(nonnull NSString *)sourceId
                                                                                           tileId:(nonnull MBMCanonicalTileID *)tileId __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)invalidateStyleCustomGeometrySourceRegionForSourceId:(nonnull NSString *)sourceId
                                                                                             bounds:(nonnull MBMCoordinateBounds *)bounds __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)addStyleCustomRasterSourceForSourceId:(nonnull NSString *)sourceId
                                                                             options:(nonnull MBMCustomRasterSourceOptions *)options __attribute((ns_returns_retained));
- (nonnull MBXExpected<NSNull *, NSString *> *)setStyleCustomRasterSourceTileDataForSourceId:(nonnull NSString *)sourceId
                                                                                       tiles:(nonnull NSArray<MBMCustomRasterSourceTileData *> *)tiles __attribute((ns_returns_retained));
/**
 * Check if the style is completely loaded.
 *
 * Note: The style specified sprite would be marked as loaded even with sprite loading error (An error will be emitted via `MapLoadingError`).
 * Sprite loading error is not fatal and we don't want it to block the map rendering, thus the function will still return `true` if style and sources are fully loaded.
 *
 * @return `true` if the style JSON contents, the style specified sprite and sources are all loaded, otherwise returns `false`.
 *
 */
- (BOOL)isStyleLoaded;
- (void)cancelStyleLoading;
- (BOOL)isStyleLoadingFinished;

@end
