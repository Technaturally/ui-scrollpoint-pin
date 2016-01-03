angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.factory('ui.scrollpoint.Pin', ['$timeout', function($timeout){

    // checks if a pin should stack on an edge against the given bounds
    function shouldStack(pin, edge, bounds){
        if(pin.$uiScrollpoint && pin.$uiScrollpoint.edges && pin.$uiScrollpoint.edges[edge]){
            var pinBounds = pin.getOriginalBounds();
            if( ( (pinBounds.left >= bounds.left && pinBounds.left <= bounds.right) || (pinBounds.right >= bounds.left && pinBounds.right <= bounds.right) ) && ( (edge == 'top' && pinBounds.top >= bounds.bottom) || (edge == 'bottom' && pinBounds.bottom <= bounds.top) ) ){
                return true;
            }
        }
        return false;
    }

    var Pin = {
        pinned: function(pin, edge){
            Pin.Stack.pinned(pin, edge);
        },
        unpinned: function(pin, edge){
            Pin.Stack.unpinned(pin, edge);
        },

        Stack: {
            onWindow: {
                items: [],
                stacked: {},
                origShift: {},
                stackShifts: {}
            },
            pinned: function(pin, edge, distance){
                // if this pin is stackable
                if(pin.stack && pin.stack.stacked){
                    // create the stack on this edge
                    if(angular.isUndefined(pin.stack.stacked[edge])){
                        pin.stack.stacked[edge] = [];
                    }
                    // check if this pin is already stacked
                    var stackIdx = pin.stack.stacked[edge].indexOf(pin);
                    if(stackIdx == -1){
                        // add this pin to the stack
                        pin.stack.stacked[edge].push(pin);

                        // adjust the other items that stack on the same target
                        if(pin.stack.items){
                            var itemIdx = pin.stack.items.indexOf(pin);
                            
                            // setup the object to track which items are shifted by this pin
                            pin.stack.stackShifts[itemIdx] = {};

                            // where is the pin and how tall is it
                            var bounds = pin.getOriginalBounds();
                            var offset = bounds.bottom-bounds.top;

                            // loop through all the other items that stack on the same target
                            for(var i in pin.stack.items){
                                // check if this item should stack with this pin
                                var cPin = pin.stack.items[i];
                                if(cPin != pin && shouldStack(cPin, edge, bounds)){
                                    // keep track of the original shift
                                    if(angular.isUndefined(pin.stack.origShift[i])){
                                        pin.stack.origShift[i] = cPin.$uiScrollpoint.shift;
                                    }

                                    // the item gets shifted by the pinned item's height - its origShift
                                    pin.stack.stackShifts[itemIdx][i] = (offset*((edge=='top')?1.0:-1.0)) - (pin.stack.origShift[itemIdx]?pin.stack.origShift[itemIdx]:pin.$uiScrollpoint.shift);

                                    // calculate how much to adjust cPin's shift
                                    var newShift = (pin.stack.origShift[i]?pin.stack.origShift[i]:0);

                                    var cBounds = cPin.getOriginalBounds();

                                    newShift += pin.$uiScrollpoint.shift - (cBounds.bottom - cBounds.top)*((edge=='top')?1.0:-1.0);

                                    // loop through all the items that stack on the same target
                                    /**
                                    for(var j in pin.stack.items){
                                        var cPin1 = pin.stack.items[j];
                                        if(cPin1 != cPin){
                                            var cBounds1 = cPin1.getOriginalBounds();

                                            // if cPin should be shifted by this other pin
                                            if(shouldStack(cPin, edge, cBounds1)){
                                                // add the shift for the other pin
                                                var itemIdx1 = pin.stack.items.indexOf(cPin1);
                                                newShift -= (cBounds1.bottom - cBounds1.top)*((edge=='top')?1.0:-1.0); // + pin.stack.items[itemIdx1]; // + (cPin1.$uiScrollpoint.shift?cPin1.$uiScrollpoint.shift:0);
                                                if(itemIdx1 != -1){
                                                    newShift += ( angular.isDefined(pin.stack.origShift[itemIdx1]) ? pin.stack.origShift[itemIdx1] : pin.stack.items[itemIdx1].$uiScrollpoint.shift );                                                        
                                                }
                                            }
                                        }
                                    }
                                    */

                                    // unpin it for now or else its placeholder is going to be out of sync
                                    if(cPin.isPinned()){
                                        cPin.unpin();
                                    }

                                    // set the uiScrollpoint value
                                    cPin.$attrs.$set('uiScrollpoint', ((newShift >= 0)?'+':'')+newShift);
                                }
                            }

                            // trigger the scroll so that anything that was adjusted gets refreshed with its new settings
                            if(pin.$uiScrollpoint.$target){
                                $timeout(function(){
                                    pin.$uiScrollpoint.$target.triggerHandler('scroll');
                                });
                            }
                        }
                    }
                }
            },
            unpinned: function(pin, edge){
                // if this pin is stackable on this edge
                if(pin.stack && pin.stack.stacked && pin.stack.stacked[edge]){
                    var stackIdx = pin.stack.stacked[edge].indexOf(pin);
                    // if it is stacked on this edge
                    if(stackIdx != -1){
                        // remove it from the stack
                        pin.stack.stacked[edge].splice(stackIdx, 1);

                        // adjust the other items that stack on the same target
                        if(pin.stack.items){
                            var itemIdx = pin.stack.items.indexOf(pin);
                            var bounds = pin.getOriginalBounds();
                            var offset = bounds.bottom-bounds.top;
                            // loop through the other items that stack on the same target
                            for(var i in pin.stack.items){
                                // if this item was shifted by the unpinned item
                                if(angular.isDefined(pin.stack.stackShifts[itemIdx]) && angular.isDefined(pin.stack.stackShifts[itemIdx][i])){
                                    // remove the amount that it was shifted by when the item was pinned
                                    var newShift = pin.stack.items[i].$uiScrollpoint.shift + pin.stack.stackShifts[itemIdx][i];
                                    pin.stack.items[i].$attrs.$set('uiScrollpoint', ((newShift >= 0)?'+':'')+newShift);
                                    pin.stack.stackShifts[itemIdx][i] = undefined;
                                }
                            }
                            // reset the stackShifts for this item
                            pin.stack.stackShifts[itemIdx] = undefined;

                            // trigger the scroll so that anything that was adjusted gets refreshed with its new settings
                            if(pin.$uiScrollpoint.$target){
                                $timeout(function(){
                                    pin.$uiScrollpoint.$target.triggerHandler('scroll');
                                });
                            }
                        }
                    }
                }
            },
            register: function(pin){
                var stack;
                if(pin.$uiScrollpoint && pin.$uiScrollpoint.hasTarget && pin.$uiScrollpoint.$target){
                    if(angular.isUndefined(pin.$uiScrollpoint.$target.stack)){
                        pin.$uiScrollpoint.$target.stack = {
                            items: [],
                            stacked: {},
                            origShift: {},
                            stackShifts: {}
                        };
                    }
                    stack = pin.$uiScrollpoint.$target.stack;
                }
                else{
                    stack = this.onWindow;
                }
                // assign the stack to the pin
                pin.stack = stack;
                if(pin.stack){
                    if(pin.stack.items){
                        if(pin.stack.items.indexOf(pin) == -1){
                            // append the pin to the stack
                            pin.stack.items.push(pin);
                        }
                    }
                }
            },
            unregister: function(pin){
                if(pin.stack){
                    if(pin.stack.items){
                        var stackIdx = pin.stack.items.indexOf(pin);
                        if(stackIdx != -1){
                            pin.stack.items.splice(stackIdx, 1);
                        }
                    }
                    pin.stack = undefined;
                }
            }
        }
    };
    return Pin;
}])
.directive('uiScrollpointPin', ['ui.scrollpoint.Pin', '$timeout', function(Pin, $timeout){
    return {
        restrict: 'A',
        priority: 100,
        require: ['uiScrollpoint', 'uiScrollpointPin'],
        controller: ['$scope', 'ui.scrollpoint.Pin', function($scope, Pin){
            var self = this;
            this.$attrs = undefined;
            this.$element = undefined;
            this.$placeholder = undefined;
            this.$uiScrollpoint = undefined;

            this.edge = undefined;
            this.offset = {};

            var origCss = {};
            var pinToTarget = false;

            this.repositionPinned = function(){
                if(self.$placeholder && self.$uiScrollpoint){
                    var scrollOffset = self.$uiScrollpoint.hasTarget ? 0 : self.$uiScrollpoint.getScrollOffset();
                    self.$element.css('left', (self.offset.x)+'px');
                    self.$element.css('top', (scrollOffset-self.offset.y)+'px');
                }
            };

            this.setAttrs = function(attrs){
                this.$attrs = attrs;
            };
            this.setElement = function(element){
                this.$element = element;
            };
            this.setScrollpoint = function(uiScrollpoint){
                this.$uiScrollpoint = uiScrollpoint;
            };
            this.getBounds = function(){
                if(this.$element){
                    return this.$element[0].getBoundingClientRect();
                }
                return null;
            };
            this.getOriginalBounds = function(){
                if(this.$placeholder){
                    return this.$placeholder[0].getBoundingClientRect();
                }
                else{
                    return this.getBounds();
                }
            };

            this.isPinned = function(){
                return ( (this.$placeholder) ? true : false );
            };

            this.pin = function(edge, distance){
                if(!this.$placeholder && this.$element && this.$uiScrollpoint){
                    // calculate the offset for its absolute positioning
                    this.offset.x = this.$element[0].offsetLeft;
                    this.offset.y = this.$uiScrollpoint.getScrollOffset() - this.$element[0].offsetTop - distance * ((edge == 'bottom')?-1.0:1.0);

                    // create an invisible placeholder
                    this.$placeholder = this.$element.clone();
                    this.$placeholder.addClass('placeholder');
                    this.$placeholder.css('visibility', 'hidden');
                    this.$element.after(this.$placeholder);

                    // pin to ui-scrollpoint-target if the parent is not the target
                    pinToTarget = (this.$uiScrollpoint.hasTarget && this.$uiScrollpoint.$target != this.$element.parent());
                    if(pinToTarget){
                        var bounds = this.$element[0].getBoundingClientRect();
                        var targetBounds = this.$uiScrollpoint.$target[0].getBoundingClientRect();

                        this.offset.x = bounds.left;
                        this.offset.y = -(this.$uiScrollpoint.$target[0].offsetTop) - (bounds.top-targetBounds.top+distance);

                        if(edge == 'bottom'){
                            this.offset.y = -(this.$uiScrollpoint.$target[0].offsetTop) - this.$uiScrollpoint.$target[0].offsetHeight + this.$element[0].offsetHeight - (bounds.bottom-targetBounds.bottom-distance);
                        }

                        this.$uiScrollpoint.$target.append(this.$element);
                    }

                    // save the css properties that get modified by pinning functions
                    origCss.position = this.$element[0].style.position; //element.css('position');
                    origCss.top = this.$element[0].style.top; //element.css('top');
                    origCss.left = this.$element[0].style.left; //element.css('left');
                    origCss.width = this.$element[0].style.width;


                    // lock the width at whatever it is before pinning (since absolute positioning could take it out of context)
                    this.$element.css('width', this.$element[0].offsetWidth+'px');

                    // pin the element
                    this.$element.addClass('pinned');
                    this.$element.css('position', 'absolute');

                    // keep track of which edge
                    this.edge = edge;

                    // adjust the element's absolute top whenever target scrolls
                    this.$uiScrollpoint.$target.on('scroll', self.repositionPinned);
                    self.repositionPinned();

                    // notify the Pin service that it is pinned
                    Pin.pinned(this, edge, distance);
                }
            };

            this.unpin = function(){
                if(this.$placeholder && this.$element && this.$uiScrollpoint){

                    // stop adjusting absolute position when target scrolls
                    this.$uiScrollpoint.$target.off('scroll', self.repositionPinned);

                    // reset element to unpinned state
                    this.$element.removeClass('pinned');
                    for(var prop in origCss){
                        this.$element.css(prop, origCss[prop]);
                    }

                    if(pinToTarget){
                        this.$placeholder.after(this.$element);
                    }

                    var edge = this.edge;
                    this.edge = undefined;

                    this.offset = {};

                    // destroy the placeholder
                    this.$placeholder.remove();
                    this.$placeholder = undefined;

                    this.$uiScrollpoint.cachePosition();

                    // notify the Pin service that it is unpinned
                    Pin.unpinned(this, edge);
                }
            };

        }],
        link: function (scope, elm, attrs , Ctrl){
            var uiScrollpoint = Ctrl[0];
            var uiScrollpointPin = Ctrl[1];

            // setup the controller
            uiScrollpointPin.setAttrs(attrs);
            uiScrollpointPin.setElement(elm);
            uiScrollpointPin.setScrollpoint(uiScrollpoint);

            // default behaviour is to stack - use ui-scrollpoint-pin-overlay="true" to disable stacking
            if(angular.isUndefined(attrs.uiScrollpointPinOverlay)){
                Pin.Stack.register(uiScrollpointPin);
            }
            attrs.$observe('uiScrollpointPinOverlay', function(uiScrollpointPinOverlay){
                if(!uiScrollpointPinOverlay){
                    uiScrollpointPinOverlay = true;
                }
                else{
                    uiScrollpointPinOverlay = scope.$eval(uiScrollpointPinOverlay);
                }

                if(!uiScrollpointPinOverlay){
                    // register to stack if it is not overlaying
                    Pin.Stack.register(uiScrollpointPin);
                    elm.removeClass('pin-overlay');
                }
                else{
                    // unregister from stack if it is overlaying
                    Pin.Stack.unregister(uiScrollpointPin);
                    elm.addClass('pin-overlay');
                }
            });

            attrs.$observe('uiScrollpointAbsolute', function(scrollpointAbsolute){
                // absolute could change the target, so unregister from its existing stack
                Pin.Stack.unregister(uiScrollpointPin);

                // on next digest cycle, register on whatever its new stack should be
                $timeout(function(){
                    Pin.Stack.register(uiScrollpointPin);
                });
            });

            attrs.$observe('uiScrollpointEnabled', function(scrollpointEnabled){
                scrollpointEnabled = scope.$eval(scrollpointEnabled);
                if(!scrollpointEnabled){
                    // unpin the element if scrollpoint is disabled
                    uiScrollpointPin.unpin();

                    // unregister from its stack
                    Pin.Stack.unregister(uiScrollpointPin);
                }
                else{
                    // register the enabled ui-scrollpoint-pin
                    Pin.Stack.register(uiScrollpointPin);
                }
            });

            // create a scrollpoint action that pins the element
            uiScrollpoint.addAction(function(distance, element, edge){
                if(distance >= 0 && !uiScrollpointPin.$placeholder){
                    uiScrollpointPin.pin(edge, distance);
                }
                else if(distance < 0 && uiScrollpointPin.$placeholder){
                    uiScrollpointPin.unpin();
                }
            });

            function reset(){
                if(uiScrollpointPin.isPinned()){
                    uiScrollpointPin.unpin();
                }
            }

            scope.$on('scrollpointShouldReset', reset);
        }
    };
}]);
