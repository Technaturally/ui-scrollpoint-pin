/*!
 * angular-ui-scrollpoint-pin
 * https://github.com/TechNaturally/ui-scrollpoint-pin
 * Version: 1.0.0 - 2015-12-21T21:27:03.403Z
 * License: MIT
 */


(function () { 
'use strict';
angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.directive('uiScrollpointPin', ['$compile', '$timeout', function ($compile, $timeout) {
    return {
        restrict: 'A',
        require: 'uiScrollpoint',
        link: function (scope, elm, attrs , uiScrollpoint){
            var placeholder;
            var offset = {};
            var origCss = {};

            function repositionPinned(){
                if(placeholder){
                    var element = elm;
                    var scrollOffset = uiScrollpoint.hasTarget ? 0 : uiScrollpoint.getScrollOffset();
                    element.css('left', (offset.x)+'px');
                    element.css('top', (scrollOffset-offset.y)+'px');
                }
            }

            // create a scrollpoint action that pins the element
            uiScrollpoint.addAction(function(distance, element){ $timeout(function(){
                if(distance >= 0 && !placeholder){
                    // PIN IT

                    // calculate the offset for its absolute positioning
                    offset.x = element[0].offsetLeft;
                    offset.y = uiScrollpoint.getScrollOffset() - element[0].offsetTop - distance * ((uiScrollpoint.hitEdge == 'bottom')?-1.0:1.0);
                    
                    // create an invisible placeholder
                    placeholder = element.clone();
                    placeholder.css('visibility', 'hidden');
                    element.after(placeholder);

                    // adjust the placeholder's attributes
                    placeholder.removeAttr('ui-scrollpoint-pin');

                    // create the unpinning function to use as placeholder's ui-scrollpoint-action
                    placeholder.attr('ui-scrollpoint-action', 'unpinIt');
                    $timeout(function(){
                        scope.unpinIt = function(distance){
                            // UNPIN IT
                            if(distance < 0 && placeholder){
                                // stop adjusting absolute position when target scrolls
                                uiScrollpoint.$target.off('scroll', repositionPinned);

                                // re-enable the scrollpoint on original element
                                uiScrollpoint.enabled = true;

                                // reset element to unpinned state
                                element.removeClass('pinned');
                                for(var prop in origCss){
                                    element.css(prop, origCss[prop]);
                                }
                                
                                // destroy the placeholder
                                placeholder.remove();
                                placeholder = undefined;
                            }
                        };
                        // compile the placeholder
                        $compile(placeholder)(scope);
                    });

                    // disable scrollpoint on element
                    uiScrollpoint.enabled = false;

                    // save the css properties that get modified by pinning functions
                    origCss.position = element.css('position');
                    origCss.top = element.css('top');
                    origCss.left = element.css('left');

                    // pin the element
                    element.addClass('pinned');
                    element.css('position', 'absolute');

                    // adjust the element's absolute top whenever target scrolls
                    uiScrollpoint.$target.on('scroll', repositionPinned);
                    repositionPinned();
                }
            }); });
        }
    };
}]);

}());