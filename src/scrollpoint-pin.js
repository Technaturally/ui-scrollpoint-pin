angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.factory('ui.scrollpoint.Pin', ['$timeout', function($timeout){
    var Groups = {
        groups: {},
        newGroup: function(groupId){
            return {
                id: groupId,
                items: [],
                active: undefined,
                addItem: function(pin){
                    if(this.items.indexOf(pin) == -1){
                        this.items.push(pin);
                        pin.group = this;
                        if(pin.$element){
                            pin.$element.addClass('pin-grouped pin-group-'+this.id);
                        }
                    }
                },
                removeItem: function(pin){
                    var pinIdx = this.items.indexOf(pin);
                    if(pinIdx != -1){
                        this.items.splice(pinIdx, 1);
                    }
                    if(pin.group == this){
                        pin.group = undefined;
                    }
                    if(pin.$element){
                        pin.$element.removeClass('pin-grouped pin-group-'+this.id);
                    }
                },
                setActive: function(pin){
                },
                pinned: function(pin, edge){
                    var pinIdx = this.items.indexOf(pin);
                    //console.log('PINNED ['+this.id+'] #'+pinIdx+' on ['+edge.scroll+']');
                },
                unpinned: function(pin, edge){
                    var pinIdx = this.items.indexOf(pin);
                    //console.log('UNPINNED ['+this.id+'] #'+pinIdx+' on ['+edge.scroll+']');
                }
            };
        },
        register: function(pin, groupId){
            if(angular.isUndefined(this.groups[groupId])){
                this.groups[groupId] = this.newGroup(groupId);
            }
            this.groups[groupId].addItem(pin);
        },
        unregister: function(pin, groupId){
            if(groupId && angular.isDefined(this.groups[groupId])){
                this.groups[groupId].removeItem(pin);
            }
            else if(!groupId && pin.group){
                pin.group.removeItem(pin);
            }
        },
        pinned: function(pin, edge){
            if(pin.group){
                pin.group.pinned(pin, edge);
            }
        },
        unpinned: function(pin, edge){
            if(pin.group){
                pin.group.unpinned(pin, edge);
            }
        }
    };

    var Pin = {
        pinned: function(pin, edge){
            Pin.Groups.pinned(pin, edge);
        },
        unpinned: function(pin, edge){
            Pin.Groups.unpinned(pin, edge);
        },
        Groups: Groups
    };
    return Pin;
}])
.directive('uiScrollpointPin', ['ui.scrollpoint.Pin', '$timeout', function(Pin, $timeout){
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

                    //$timeout(function(){
                    //    self.$uiScrollpoint.cachePosition();
                    //});
                    
                    // notify the Pin service that it is unpinned
                    Pin.unpinned(this, edge);
                }
            };

        }],
        link: function (scope, elm, attrs , Ctrl){
            var uiScrollpoint = Ctrl[0];
            var uiScrollpointPin = Ctrl[1];

            var groupId = undefined;

            // setup the controller
            uiScrollpointPin.setAttrs(attrs);
            uiScrollpointPin.setElement(elm);
            uiScrollpointPin.setScrollpoint(uiScrollpoint);

            // ui-scrollpoint attribute
            attrs.$observe('uiScrollpoint', function(scrollpoint){
                // unpin it so the placeholder can get refreshed
                // if it should be pinned, ui-scrollpoint's reset will trigger the action
                uiScrollpointPin.unpin();
            });

            // ui-scrollpoint-enabled attribute
            attrs.$observe('uiScrollpointEnabled', function(scrollpointEnabled){
                scrollpointEnabled = scope.$eval(scrollpointEnabled);
                if(!scrollpointEnabled){
                    uiScrollpointPin.unpin();

                    Pin.Groups.unregister(uiScrollpointPin, groupId);
                }
                else{
                    if(groupId){
                        Pin.Groups.register(uiScrollpointPin, groupId);
                    }
                }
            });

            // ui-scrollpoint-pin-group attribute
            attrs.$observe('uiScrollpointPinGroup', function(pinGroup){
                if(pinGroup){
                    groupId = pinGroup.replace(/[^a-zA-Z0-9-]/g, '-');
                    Pin.Groups.register(uiScrollpointPin, groupId);
                }
                else{
                    Pin.Groups.unregister(uiScrollpointPin, groupId);
                    groupId = undefined;
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
                    //uiScrollpointPin.unpin();
                }
                $timeout(function(){
                    uiScrollpoint.$target.triggerHandler('scroll');
                }, 2);
            }
            scope.$on('scrollpointShouldReset', reset);
        }
    };
}]);
