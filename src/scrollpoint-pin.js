angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.factory('ui.scrollpoint.Pin', ['$timeout', function($timeout){
    var Util = {
        hide: function(pin){
            if(pin.$element && pin.isPinned() && (!pin.group || pin != pin.group.active)){
                if(angular.isFunction(pin.$element.hide)){
                    pin.$element.hide();
                }
                else{
                    pin.$element.css('display', 'none');
                    pin.$element.css('visibility', 'hidden');
                }
            }
        },
        show: function(pin){
            if(pin.$element){
                if(angular.isFunction(pin.$element.show)){
                    pin.$element.show();
                }
                else{
                    pin.$element.css('display', null);
                    pin.$element.css('visibility', null);
                }
            }
        },
        getOffset: function(pin, scroll_edge){
            // looks up the offset for the element_edge closest to the scroll_edge (whilst applying shifts)
            var offset;
            if(pin && pin.$uiScrollpoint){
                var bounds = pin.getOriginalBounds();
                var scrollpoint = pin.$uiScrollpoint;
                // loop through all the pin's element edges
                var itemEdges = scrollpoint.getEdge(scroll_edge);
                if(itemEdges){
                    for(var elem_edge in itemEdges){
                        // get the real edge definition (uses default if necessary)
                        var edge = scrollpoint.getEdge(scroll_edge, elem_edge);
                        if(edge){
                            var edgeOffset;
                            // calculate the offset - this block is copied from uiScrollpoint's checkOffset method
                            if(edge.absolute){
                                if(edge.percent){
                                    edgeOffset = edge.shift / 100.0 * scrollpoint.getTargetScrollHeight();
                                }
                                else{
                                    edgeOffset = edge.shift;
                                }
                                if(scroll_edge == 'bottom'){
                                    edgeOffset = scrollpoint.getTargetContentHeight() - edgeOffset;
                                    if(scrollpoint.hasTarget){
                                        edgeOffset += scrollpoint.getTargetHeight();
                                    }
                                }
                            }
                            else{
                                if(elem_edge == 'top'){
                                    edgeOffset = bounds.top;
                                }
                                else if(elem_edge == 'bottom'){
                                    edgeOffset = bounds.bottom;
                                }
                                edgeOffset += edge.shift;
                            }

                            // use this offset if it is closer to the scroll_edge than the previous chosen one
                            if(angular.isUndefined(offset) || offset <= edgeOffset){
                                offset = edgeOffset;
                            }
                        }
                    }
                }
            }
            return offset;
        }
    };

    var Groups = {
        groups: {},
        newGroup: function(groupId){
            return {
                id: groupId,
                items: [],
                active: {},
                addItem: function(pin){
                    if(this.items.indexOf(pin) == -1){
                        this.items.push(pin);
                        pin.group = this;
                        if(pin.$element){
                            pin.$element.addClass('pin-grouped pin-group-'+this.id);
                        }
                        this.refreshActive(pin);
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
                    Util.show(pin);
                    this.refreshActive(pin);
                },
                refreshActive: function(pin, edge){
                    if(pin && pin.$uiScrollpoint){
                        var edges = pin.$uiScrollpoint.edges;
                        // for each of the edges this pin works with
                        for(var scroll_edge in edges){
                            // only process if no edge was specified or it is the specified edge
                            if(angular.isUndefined(edge) || scroll_edge == edge){
                                // determine the best match from the group for this edge
                                var edgeOffset;
                                var edgePin;
                                for(var i in this.items){
                                    var item = this.items[i];
                                    // only check the item if it is pinned
                                    if(item.isPinned() && item.$uiScrollpoint && item.edge && item.edge.scroll == scroll_edge){
                                        // lookup its offset
                                        var checkOffset = Util.getOffset(item, scroll_edge);
                                        if(angular.isDefined(checkOffset) && (angular.isUndefined(edgeOffset) || (scroll_edge=='top' && checkOffset >= edgeOffset) || (scroll_edge=='bottom' && checkOffset <= edgeOffset)) ){
                                            // choose it if it is closer to the scroll edge than the previously chosen item
                                            edgeOffset = checkOffset;
                                            edgePin = item;
                                        }
                                    }
                                }

                                // mark it as active
                                this.active[scroll_edge] = edgePin;

                                // refresh the visibility of items on this edge
                                this.refreshVisibility(scroll_edge);

                                // show this item
                                if(edgePin){
                                    Util.show(edgePin);
                                }
                            }
                        }
                    }
                },
                refreshVisibility: function(edge){
                    for(var i in this.items){
                        var item = this.items[i];
                        // hide the item if it is pinned on this edge and it is not active
                        //item.$uiScrollpoint && item.$uiScrollpoint.edges && item.$uiScrollpoint.edges[edge] && 
                        if(item.isPinned() && item.edge && item.edge.scroll == edge && item != this.active[edge]){
                            Util.hide(item);
                        }
                    }
                },
                getActive: function(scroll_edge){
                    if(this.active[scroll_edge]){
                        return this.active[scroll_edge];
                    }
                },
                getFirst: function(scroll_edge){
                    var firstPin;
                    var edgeOffset;
                    for(var i in this.items){
                        var item = this.items[i];
                        var checkOffset = Util.getOffset(item, scroll_edge);
                        if(angular.isDefined(checkOffset) && (angular.isUndefined(edgeOffset) || (scroll_edge=='top' && checkOffset <= edgeOffset) || (scroll_edge=='bottom' && checkOffset >= edgeOffset)) ){
                            edgeOffset = checkOffset;
                            firstPin = item;
                        }
                    }
                    return firstPin;
                },
                pinned: function(pin, edge){
                    this.refreshActive(pin, edge.scroll);
                },
                unpinned: function(pin, edge){
                    var self = this;
                    this.refreshActive(pin, edge.scroll);
                    Util.show(pin); // make sure it is visible if it is unpinned
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

    var Stack = {
        onWindow: undefined,
        newStack: function(){
            return {
                items: [],
                stacked: {},
                origEdges: {},
                addItem: function(pin){
                    if(this.items.indexOf(pin) == -1){
                        // add the pin to items
                        this.items.push(pin);
                        var pinIdx = this.items.length - 1;

                        // assign the stack to the pin
                        pin.stack = this;

                        // cache the original edges for this pin
                        var self = this;
                        $timeout(function(){
                            self.origEdges[pinIdx] = angular.copy(pin.$uiScrollpoint.edges);
                        });
                    }
                },
                removeItem: function(pin){
                    var pinIdx = this.items.indexOf(pin);
                    if(pinIdx != -1){
                        // remove the pin from items
                        this.items.splice(pinIdx, 1);

                        // reset the edges
                        if(this.origEdges[pinIdx]){
                            this.applyEdges([{pin: pin, edges: angular.copy(this.origEdges[pinIdx])}], 150);
                            this.origEdges[pinIdx] = undefined;
                        }

                        // remove the pin from the stacked items
                        for(var edge in this.stacked){
                            var pinnedIdx = this.stacked[edge].indexOf(pin);
                            if(pinnedIdx != -1){
                                this.stacked[edge].splice(pinnedIdx, 1);
                            }
                        }

                        // update the indexes of origEdges
                        for(var i in this.origEdges){
                            if(i > pinIdx){
                                this.origEdges[i - 1] = this.origEdges[i];
                                this.origEdges[i] = undefined;
                            }
                        }
                    }

                    // remove the stack from the pin
                    if(pin.stack == this){
                        pin.stack = undefined;
                    }
                },

                refreshEdges: function(pin, edge){
                    if(edge.scroll){
                        var bounds = pin.getOriginalBounds();
                        var shiftPins = [];
                        for(var i in this.items){
                            if(this.items[i] != pin){
                                var new_edges = this.getNewEdges(this.items[i], edge.scroll);
                                if(new_edges){
                                    shiftPins.push({
                                        pin: this.items[i],
                                        edges: new_edges
                                    });
                                }
                            }
                        }
                        this.applyEdges(shiftPins);
                    }
                },
                applyEdges: function(shifts, rescrollDelay){
                    if(angular.isUndefined(rescrollDelay)){
                        rescrollDelay = 100;
                    }
                    if(shifts.length){
                        var targets = [];
                        for(var i in shifts){
                            var shift = shifts[i];
                            this.setEdges(shift.pin, shift.edges);

                            if(shift.pin.$uiScrollpoint.$target && targets.indexOf(shift.pin.$uiScrollpoint.$target) == -1){
                                targets.push(shift.pin.$uiScrollpoint.$target);
                            }
                        }
                        if(targets.length){
                            $timeout(function(){
                                for(var i in targets){
                                    targets[i].triggerHandler('scroll');
                                }
                            }, rescrollDelay);
                        }
                    }
                },
                setEdges: function(pin, edges){
                    edges = this.prepareEdgeAttr(edges);
                    pin.unpin();
                    pin.$attrs.$set('uiScrollpointEdge', angular.toJson(edges));
                },
                prepareEdgeAttr: function(edges){
                    var new_edges;
                    for(var scroll_edge in edges){
                        if(angular.isObject(edges[scroll_edge])){
                            for(var elem_edge in edges[scroll_edge]){
                                var edge = edges[scroll_edge][elem_edge];
                                if(angular.isUndefined(new_edges)){
                                    new_edges = {};
                                }
                                if(angular.isUndefined(new_edges[scroll_edge])){
                                    new_edges[scroll_edge] = {};
                                }
                                if(angular.isObject(edge)){
                                    if(edge.absolute){
                                        new_edges[scroll_edge][elem_edge] = edge.shift+(edge.percent?'%':'');
                                    }
                                    else{
                                        new_edges[scroll_edge][elem_edge] = ((edge.shift >= 0)?'+':'')+edge.shift;
                                    }
                                }
                                else{
                                    new_edges[scroll_edge][elem_edge] = edge;
                                }
                            }
                        }
                        else{
                            new_edges[scroll_edge] = edges[scroll_edge];
                        }
                    }
                    return new_edges;
                },
                getOriginalEdge: function(pin, scroll_edge, elem_edge){
                    var edge;
                    var itemIdx = this.items.indexOf(pin);
                    if(itemIdx != -1){
                        if(this.origEdges[itemIdx]){
                            var edges = this.origEdges[itemIdx];

                            if(edges[scroll_edge] && edges[scroll_edge][elem_edge] && edges[scroll_edge][elem_edge] !== true){
                                edge = edges[scroll_edge][elem_edge];
                            }
                            if(!edge){
                                edge = pin.$uiScrollpoint.default_edge;
                            }
                        }
                    }
                    return edge;
                },
                getNewEdges: function(pin, scroll_edge){
                    var itemIdx = this.items.indexOf(pin);
                    if(itemIdx != -1){
                        var origEdges = this.origEdges[itemIdx];
                        var new_edges = {};
                        var edges_changed = false;
                        for(var other_edge in pin.$uiScrollpoint.edges){
                            new_edges[other_edge] = pin.$uiScrollpoint.edges[other_edge];
                        }
                        var elem_edges = pin.$uiScrollpoint.getEdge(scroll_edge);
                        for(var elem_edge in elem_edges){
                            var edge = pin.$uiScrollpoint.getEdge(scroll_edge, elem_edge);
                            if(edge && !edge.absolute){
                                var shift = this.calculateShift(pin, scroll_edge);
                                var origEdge = this.getOriginalEdge(pin, scroll_edge, elem_edge);
                                var newShift = (origEdge?origEdge.shift:0) - shift;
                                if(new_edges[scroll_edge][elem_edge].shift != newShift){
                                    new_edges[scroll_edge][elem_edge] = {
                                        shift: newShift,
                                        absolute: false,
                                        percent: false,
                                        pin_shift: true
                                    };

                                    edges_changed = true;
                                }
                            }
                        }
                        if(edges_changed){
                            return new_edges;
                        }
                    }
                },
                calculateShift: function(pin, scroll_edge){
                    var offset;
                    if(this.stacked[scroll_edge]){
                        for(var i in this.stacked[scroll_edge]){
                            var item = this.stacked[scroll_edge][i];
                            if(item != pin && item.isPinned() && this.shouldStack(pin, scroll_edge, item)){
                                if(item.group && item.group.getActive(scroll_edge) != item){
                                    continue;
                                }
                                var shiftBounds = item.getBounds();
                                if(scroll_edge == 'top' && (angular.isUndefined(offset) || shiftBounds.bottom >= offset)){
                                    offset = shiftBounds.bottom;
                                }
                                else if(scroll_edge == 'bottom' && (angular.isUndefined(offset) || shiftBounds.top <= offset)){
                                    offset = shiftBounds.top;
                                }
                            }
                        }
                        if(angular.isDefined(offset)){
                            if(pin.$uiScrollpoint.hasTarget){
                                var targetBounds = pin.$uiScrollpoint.$target[0].getBoundingClientRect();
                                offset -= targetBounds.top;
                            }
                            if(scroll_edge == 'bottom'){
                                offset -= pin.$uiScrollpoint.getTargetHeight();
                            }
                        }
                    }
                    return (offset ? offset : 0);
                },
                shouldStack: function(pin, edge, against){
                    if(against.isPinned() && pin != against){
                        if(against.group){
                            against = against.group.getFirst(edge);
                        }
                        var bounds = against.getOriginalBounds();
                        var pinBounds = pin.getOriginalBounds();
                        if( ( (pinBounds.left >= bounds.left && pinBounds.left <= bounds.right) || (pinBounds.right >= bounds.left && pinBounds.right <= bounds.right) || (bounds.left >= pinBounds.left && bounds.left <= pinBounds.right) || (bounds.right >= pinBounds.left && bounds.right <= pinBounds.right) ) && ( (edge == 'top' && pinBounds.top >= bounds.bottom) || (edge == 'bottom' && pinBounds.bottom <= bounds.top) ) ){
                            if(pin.group){
                                // don't stack it against members of its own group
                                if(!against.group || pin.group.id != against.group.id){
                                    // stack the first member of a group
                                    var firstInGroup = pin.group.getFirst(edge);
                                    if(pin == firstInGroup || this.shouldStack(firstInGroup, edge, against)){
                                        return true;
                                    }
                                }
                            }
                            else{
                                return true;
                            }
                        }
                    }
                    return false;
                },

                pinned: function(pin, edge){
                    if(edge.scroll){
                        if(angular.isUndefined(this.stacked[edge.scroll])){
                            this.stacked[edge.scroll] = [];
                        }
                        var pinnedIdx = this.stacked[edge.scroll].indexOf(pin);
                        if(pinnedIdx == -1){
                            var checkEdge = pin.$uiScrollpoint.getEdge(edge.scroll, edge.element);
                            // add this pin to the stack
                            this.stacked[edge.scroll].push(pin);
                            var self = this;
                            $timeout(function(){
                                self.refreshEdges(pin, edge);
                            }, 150);
                        }
                    }
                },
                unpinned: function(pin, edge){
                    if(this.stacked[edge.scroll]){
                        var pinnedIdx = this.stacked[edge.scroll].indexOf(pin);
                        if(pinnedIdx != -1){
                            this.stacked[edge.scroll].splice(pinnedIdx, 1);
                            var self = this;
                            $timeout(function(){
                                self.refreshEdges(pin, edge);
                            });
                        }
                    }
                }
            };
        },
        register: function(pin){
            var stack;
            if(pin.$uiScrollpoint && pin.$uiScrollpoint.hasTarget && pin.$uiScrollpoint.$target){
                if(angular.isUndefined(pin.$uiScrollpoint.$target.stack)){
                    pin.$uiScrollpoint.$target.stack = this.newStack();
                }
                stack = pin.$uiScrollpoint.$target.stack;
            }
            else{
                stack = this.onWindow;
            }
            if(stack){
                stack.addItem(pin);
            }
        },
        unregister: function(pin){
            if(pin.stack){
                pin.stack.removeItem(pin);
            }
        },
        pinned: function(pin, edge){
            if(pin.stack){
                pin.stack.pinned(pin, edge);
            }
        },
        unpinned: function(pin, edge){
            if(pin.stack){
                pin.stack.unpinned(pin, edge);
            }
        }
    };
    Stack.onWindow = Stack.newStack();

    var Pin = {
        pinned: function(pin, edge){
            Pin.Stack.pinned(pin, edge);
            Pin.Groups.pinned(pin, edge);
        },
        unpinned: function(pin, edge){
            Pin.Stack.unpinned(pin, edge);
            Pin.Groups.unpinned(pin, edge);
        },
        Groups: Groups,
        Stack: Stack
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

            var groupId;

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

            // default behaviour is to stack - use ui-scrollpoint-pin-overlap="true" to disable stacking
            if(angular.isUndefined(attrs.uiScrollpointPinOverlap)){
                Pin.Stack.register(uiScrollpointPin);
            }
            attrs.$observe('uiScrollpointPinOverlap', function(uiScrollpointPinOverlap){
                if(!uiScrollpointPinOverlap && uiScrollpointPinOverlap !== false){
                    uiScrollpointPinOverlap = true;
                }
                else{
                    uiScrollpointPinOverlap = scope.$eval(uiScrollpointPinOverlap);
                }

                if(!uiScrollpointPinOverlap){
                    // register to stack if it is not overlapping
                    Pin.Stack.register(uiScrollpointPin);
                    elm.removeClass('pin-overlap');
                }
                else{
                    // unregister from stack if it is overlapping
                    uiScrollpointPin.unpin();
                    Pin.Stack.unregister(uiScrollpointPin);
                    elm.addClass('pin-overlap');
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

            // ui-scrollpoint-enabled attribute
            attrs.$observe('uiScrollpointEnabled', function(scrollpointEnabled){
                scrollpointEnabled = scope.$eval(scrollpointEnabled);
                if(!scrollpointEnabled){
                    uiScrollpointPin.unpin();

                    Pin.Stack.unregister(uiScrollpointPin);
                    Pin.Groups.unregister(uiScrollpointPin, groupId);
                }
                else{
                    if(angular.isUndefined(attrs.uiScrollpointPinOverlap)){
                        Pin.Stack.register(uiScrollpointPin);
                    }
                    if(groupId){
                        Pin.Groups.register(uiScrollpointPin, groupId);
                    }
                }
            });

            // ui-scrollpoint-pin-group attribute
            attrs.$observe('uiScrollpointPinGroup', function(pinGroup){
                if(pinGroup){
                    if(groupId){
                        Pin.Groups.unregister(uiScrollpointPin, groupId);
                    }
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
                $timeout(function(){
                    uiScrollpoint.$target.triggerHandler('scroll');
                }, 2);
            }
            scope.$on('scrollpointShouldReset', reset);
        }
    };
}]);
