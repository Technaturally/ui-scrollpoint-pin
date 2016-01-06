angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.factory('ui.scrollpoint.Pin', ['$timeout', function($timeout){
    function hide(pin){
        $timeout(function(){
            if(pin.$element && pin.isPinned() && (!pin.group || pin != pin.group.active)){
                if(angular.isFunction(pin.$element.hide)){
                    pin.$element.hide();
                }
                else{
                    pin.$element.css('display', 'none');
                    pin.$element.css('visibility', 'hidden');
                }
            }
        });
    }
    function show(pin){
        if(pin.$element){
            if(angular.isFunction(pin.$element.show)){
                pin.$element.show();
            }
            else{
                pin.$element.css('display', null);
                pin.$element.css('visibility', null);
            }
        }
    }

    var Pin = {
        pinned: function(pin, edge){
            Pin.Group.pinned(pin, edge);
        },
        unpinned: function(pin, edge){
            Pin.Group.unpinned(pin, edge);
        },
        Group: {
            group: {},
            newGroup: function(groupId){
                return {
                    id: groupId,
                    pins: [],
                    active: undefined,
                    setActive: function(pin, hideOld, showNew){
                        if(!pin || !pin.isPinned()){
                            pin = undefined;
                        }

                        if(angular.isUndefined(hideOld)){
                            hideOld = true;
                        }
                        if(angular.isUndefined(showNew)){
                            showNew = true;
                        }

                        if(hideOld && this.active && this.active != pin){
                            hide(this.active);
                        }

                        this.active = pin;

                        if(showNew && this.active){
                            show(this.active);
                        }
                    }
                };
            },
            pinned: function(pin, edge){
                if(pin.group){
                    pin.group.setActive(pin);
                }
            },
            unpinned: function(pin, edge){
                if(pin.group){
                    show(pin);
                    if(pin.group.active == pin){
                        var pinIdx = pin.group.pins.indexOf(pin);
                        if(pinIdx > 0 && pin.group.pins.length){
                            pin.group.setActive(pin.group.pins[pinIdx-1], false, true);
                        }
                        else{
                            pin.group.setActive(undefined, false, false);
                        }
                    }
                }
            },
            register: function(groupId, pin){
                if(angular.isUndefined(this.group[groupId])){
                    this.group[groupId] = this.newGroup(groupId);
                }
                if(this.group[groupId].pins.indexOf(pin) == -1){
                    this.group[groupId].pins.push(pin);
                    pin.group = this.group[groupId];
                }
            },
            unregister: function(groupId, pin){
                if(angular.isDefined(this.group[groupId])){
                    var pinIdx = this.group[groupId].pins.indexOf(pin);
                    if(pinIdx != -1){
                        this.group[groupId].pins.splice(pinIdx, 1);
                    }
                    if(pin.group == this.group[groupId]){
                        pin.group = undefined;
                    }
                }
            }
        }
    };
    return Pin;
}])
.directive('uiScrollpointPin', ['ui.scrollpoint.Pin', function(Pin){
    return {
        restrict: 'A',
        priority: 100,
        require: ['uiScrollpoint', 'uiScrollpointPin'],
        controller: ['$scope', 'ui.scrollpoint.Pin', '$timeout', function($scope, Pin, $timeout){
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

            this.pin = function(scroll_edge, elem_edge, distance){
                if(!this.$placeholder && this.$element && this.$uiScrollpoint){
                    // calculate the offset for its absolute positioning
                    this.offset.x = this.$element[0].offsetLeft;
                    this.offset.y = this.$uiScrollpoint.getScrollOffset() - this.$element[0].offsetTop - distance * ((scroll_edge == 'bottom')?-1.0:1.0);

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

                        if(scroll_edge == 'bottom'){
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
                    this.edge = {scroll: scroll_edge, element: elem_edge};

                    // adjust the element's absolute top whenever target scrolls
                    this.$uiScrollpoint.$target.on('scroll', self.repositionPinned);
                    self.repositionPinned();

                    // notify the Pin service that it is pinned
                    Pin.pinned(this, this.edge, distance);
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

                    $timeout(function(){
                        self.$uiScrollpoint.cachePosition();
                    });
                    
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

            attrs.$observe('uiScrollpointEnabled', function(scrollpointEnabled){
                scrollpointEnabled = scope.$eval(scrollpointEnabled);
                if(!scrollpointEnabled){
                    uiScrollpointPin.unpin();
                }
            });

            attrs.$observe('uiScrollpointPinGroup', function(pinGroup){
                var groupId = pinGroup.replace(/[^a-zA-Z0-9-]/g, '-');
                var groupClass = 'pin-grouped pin-group-'+groupId;
                if(pinGroup){
                    Pin.Group.register(groupId, uiScrollpointPin);
                    elm.addClass(groupClass);
                }
                else{
                    Pin.Group.unregister(groupId, uiScrollpointPin);
                    elm.removeClass(groupClass);
                }
            });

            // create a scrollpoint action that pins the element
            uiScrollpoint.addAction(function(distance, element, scroll_edge, elem_edge){
                if(distance >= 0 && !uiScrollpointPin.$placeholder){
                    uiScrollpointPin.pin(scroll_edge, elem_edge, distance);
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
