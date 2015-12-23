/*!
 * angular-ui-scrollpoint-pin
 * https://github.com/TechNaturally/ui-scrollpoint-pin
 * Version: 1.1.0 - 2015-12-23T05:08:37.581Z
 * License: MIT
 */


(function () { 
'use strict';
angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.directive('uiScrollpointPin', [function () {
    return {
        restrict: 'A',
        require: 'uiScrollpoint',
        link: function (scope, elm, attrs , uiScrollpoint){
            var placeholder;
            var offset = {};
            var origCss = {};
            var pinToTarget = false;

            function repositionPinned(){
                if(placeholder){
                    var element = elm;
                    var scrollOffset = uiScrollpoint.hasTarget ? 0 : uiScrollpoint.getScrollOffset();
                    element.css('left', (offset.x)+'px');
                    element.css('top', (scrollOffset-offset.y)+'px');
                }
            }

            // create a scrollpoint action that pins the element
            uiScrollpoint.addAction(function(distance, element, edge){
                if(distance >= 0 && !placeholder){
                    // PIN IT

                    // calculate the offset for its absolute positioning
                    offset.x = element[0].offsetLeft;
                    offset.y = uiScrollpoint.getScrollOffset() - element[0].offsetTop - distance * ((edge == 'bottom')?-1.0:1.0);

                    // create an invisible placeholder
                    placeholder = element.clone();
                    placeholder.addClass('placeholder');
                    placeholder.css('visibility', 'hidden');
                    element.after(placeholder);

                    // pin to ui-scrollpoint-target if the parent is not the target
                    pinToTarget = (uiScrollpoint.hasTarget && uiScrollpoint.$target != element.parent());
                    if(pinToTarget){
                        var bounds = element[0].getBoundingClientRect();
                        var targetBounds = uiScrollpoint.$target[0].getBoundingClientRect();

                        offset.x = bounds.left;
                        offset.y = -uiScrollpoint.$target[0].offsetTop - (bounds.top-targetBounds.top+distance);

                        if(edge == 'bottom'){
                            offset.y = -uiScrollpoint.$target[0].offsetTop - uiScrollpoint.$target[0].offsetHeight + element[0].offsetHeight - (bounds.bottom-targetBounds.bottom-distance);
                        }

                        uiScrollpoint.$target.append(element);
                    }

                    // save the css properties that get modified by pinning functions
                    origCss.position = element[0].style.position; //element.css('position');
                    origCss.top = element[0].style.top; //element.css('top');
                    origCss.left = element[0].style.left; //element.css('left');

                    // pin the element
                    element.addClass('pinned');
                    element.css('position', 'absolute');

                    // adjust the element's absolute top whenever target scrolls
                    uiScrollpoint.$target.on('scroll', repositionPinned);
                    repositionPinned();
                }
                else if(distance < 0 && placeholder){
                    // UNPIN IT

                    // stop adjusting absolute position when target scrolls
                    uiScrollpoint.$target.off('scroll', repositionPinned);

                    // reset element to unpinned state
                    element.removeClass('pinned');
                    for(var prop in origCss){
                        element.css(prop, origCss[prop]);
                    }

                    if(pinToTarget){
                        placeholder.after(element);
                    }

                    // destroy the placeholder
                    placeholder.remove();
                    placeholder = undefined;

                    uiScrollpoint.cachePosition();
                }
            });
        }
    };
}]);

}());