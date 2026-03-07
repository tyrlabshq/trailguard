// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMInteractionContext;
@class MBMQueriedFeature;

NS_SWIFT_NAME(InteractionHandler)
@protocol MBMInteractionHandler
- (BOOL)handleBeginForFeature:(nullable MBMQueriedFeature *)feature
                      context:(nonnull MBMInteractionContext *)context;
- (void)handleChangeForContext:(nonnull MBMInteractionContext *)context;
- (void)handleEndForContext:(nonnull MBMInteractionContext *)context;
@end
