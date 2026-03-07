// This file is generated and will be overwritten automatically.

#import <MapboxCoreMaps/MBMViewAnnotationPositionDescriptor.h>

@interface MBMViewAnnotationPositionDescriptor ()
- (nonnull instancetype)initWithIdentifier:(nonnull NSString *)identifier
                                     width:(double)width
                                    height:(double)height
                         leftTopCoordinate:(nonnull MBMScreenCoordinate *)leftTopCoordinate
                          anchorCoordinate:(CLLocationCoordinate2D)anchorCoordinate
                              anchorConfig:(nonnull MBMViewAnnotationAnchorConfig *)anchorConfig NS_REFINED_FOR_SWIFT;
@property (nonatomic, readonly, nonnull) MBMScreenCoordinate *leftTopCoordinate;
@end
