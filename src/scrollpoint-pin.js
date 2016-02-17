angular.module('ui.scrollpoint.pin', ['ui.scrollpoint'])
.factory('ui.scrollpoint.Pin', ['$timeout', function($timeout){
    var Util = {
        hide: function(pin){
            if(pin.$element && pin.isPinned() && (!pin.group || pin != pin.group.active)){
                if(angular.isFunction(pin.$element.hide)){
                    pin.$element.hide();
                }
                else{
                    //pin.$element.css('display', 'none');
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
                    //pin.$element.css('display', null);
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
                                for(var i=0; i < this.items.length; i++){
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
                    for(var i=0; i < this.items.length; i++){
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
                    for(var i=0; i < this.items.length; i++){
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
        getGroupSet: function(pin){
            var groups;
            if(pin.$uiScrollpoint && pin.$uiScrollpoint.hasTarget && pin.$uiScrollpoint.$target){
                if(angular.isUndefined(pin.$uiScrollpoint.$target.groups)){
                    pin.$uiScrollpoint.$target.groups = {};
                }
                groups = pin.$uiScrollpoint.$target.groups;
            }
            else{
                groups = this.groups;
            }
            return groups;
        },
        register: function(pin, groupId){
            var groups = this.getGroupSet(pin);

            if(angular.isUndefined(groups[groupId])){
                groups[groupId] = this.newGroup(groupId);
            }
            groups[groupId].addItem(pin);
        },
        unregister: function(pin, groupId){
            var groups = this.getGroupSet(pin);

            if(groupId && angular.isDefined(groups[groupId])){
                groups[groupId].removeItem(pin);
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
                addItem: function(pin){
                    if(this.items.indexOf(pin) == -1){
                        // add the pin to items
                        this.items.push(pin);
                        var pinIdx = this.items.length - 1;

                        // assign the stack to the pin
                        pin.stack = this;
                    }
                },
                removeItem: function(pin){
                    var pinIdx = this.items.indexOf(pin);
                    if(pinIdx != -1){
                        // remove the pin from items
                        this.items.splice(pinIdx, 1);

                        // remove the pin from the stacked items
                        for(var edge in this.stacked){
                            var pinnedIdx = this.stacked[edge].indexOf(pin);
                            if(pinnedIdx != -1){
                                this.stacked[edge].splice(pinnedIdx, 1);
                            }
                        }
                    }

                    // remove the stack from the pin
                    if(pin.stack == this){
                        pin.stack = undefined;
                    }
                },
                shouldStack: function(pin, edge, against){
                    if(pin && against.isPinned() && pin != against && pin.stackGroupMatches(against.stackGroup)){
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

                recalibrateStacked: function(pin, edge){
                    for(var i=0; i < this.stacked[edge].length; i++){
                        var item = this.stacked[edge][i];
                        if(item.stackTargets && item.stackTargets[edge] && item.stackTargets[edge].indexOf(pin) != -1){
                            item.recalibratePosition();
                        }
                    }
                },
                getStackTop: function(pin, edge){
                    var stackTop = pin;
                    var item;
                    while((item = stackTop.stackedOn)){
                        stackTop = item;
                    }
                    return stackTop;
                },

                getStackTarget: function(pin, edge){
                    var stackTarget;
                    if(pin.stackTargets && pin.stackTargets[edge]){
                        var offset;
                        for(var i = 0; i < pin.stackTargets[edge].length; i++){
                            var item = pin.stackTargets[edge][i];
                            var itemBounds = item.$element[0].getBoundingClientRect();
                            var itemOffset = itemBounds.top + ((edge != 'bottom') ? item.$element[0].offsetHeight : 0);
                            if(angular.isUndefined(offset) || (edge == 'top' && itemOffset > offset) || (edge == 'bottom' && itemOffset < offset)){
                                stackTarget = item;
                                offset = itemOffset;
                            }
                        }
                    }
                    return stackTarget;
                },
                setStackTargets: function(pin, edge){
                    for(var i=0; i < this.items.length; i++){
                        var item = this.items[i];
                        if(this.shouldStack(item, edge, pin)){
                            if(angular.isUndefined(item.stackTargets[edge])){
                                item.stackTargets[edge] = [];
                            }
                            if(item.stackTargets[edge].indexOf(pin) == -1){
                                item.stackTargets[edge].push(pin);
                            }
                            item.recalibratePosition();
                        }
                    }
                },
                removeStackTarget: function(pin, edge){
                    for(var i=0; i < this.items.length; i++){
                        var item = this.items[i];
                        if(angular.isDefined(item.stackTargets[edge])){
                            var pinIndex = item.stackTargets[edge].indexOf(pin);
                            if(pinIndex != -1){
                                item.stackTargets[edge].splice(pinIndex, 1);

                                if(item.isPinned() && item.edge && item.edge.scroll == edge){
                                    item.recalibratePosition();
                                }
                            }
                        }
                    }
                },

                assignStacked: function(pin, scroll_edge){
                    var stackTarget = this.getStackTarget(pin, scroll_edge);
                    pin.stackedOn = (stackTarget && stackTarget != pin) ? stackTarget : null;
                    if(pin.stackedOn){
                        if(angular.isUndefined(pin.stackedOn.stackedUnder)){
                            pin.stackedOn.stackedUnder = [];
                        }
                        if(pin.stackedOn.stackedUnder.indexOf(pin) == -1){
                            pin.stackedOn.stackedUnder.push(pin);
                        }
                    }
                },
                unassignStacked: function(pin, scroll_edge){
                    if(pin.stackedOn && pin.stackedOn.stackedUnder){
                        var pinIdx = pin.stackedOn.stackedUnder.indexOf(pin);
                        if(pinIdx != -1){
                            pin.stackedOn.stackedUnder.splice(pinIdx, 1);
                        }
                    }
                    pin.stackedOn = undefined;
                },

                pinned: function(pin, edge){
                    if(edge.scroll){
                        if(angular.isUndefined(this.stacked[edge.scroll])){
                            this.stacked[edge.scroll] = [];
                        }
                        var pinnedIdx = this.stacked[edge.scroll].indexOf(pin);
                        if(pinnedIdx == -1){
                            // add this pin to the stack
                            this.stacked[edge.scroll].push(pin);
                            this.setStackTargets(pin, edge.scroll);
                        }

                        this.assignStacked(pin, edge.scroll);
                    }
                },
                unpinned: function(pin, edge){
                    if(this.stacked[edge.scroll]){
                        var pinnedIdx = this.stacked[edge.scroll].indexOf(pin);
                        if(pinnedIdx != -1){
                            this.stacked[edge.scroll].splice(pinnedIdx, 1);
                        }
                    }
                    this.removeStackTarget(pin, edge.scroll);
                    this.unassignStacked(pin, edge.scroll);
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
.directive('uiScrollpointPin', ['ui.scrollpoint.Pin', '$timeout', '$interval', function(Pin, $timeout, $interval){
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
            this.stackGroup = undefined;
            this.stackAgainst = undefined;
            this.stackTargets = {};

            this.overflow = undefined;

            var origCss = {};
            var origCheckOffset;
            var pinToTarget = false;

            var lastScrollOffset;
            this.currentScrollDistance = function(){
                if(angular.isDefined(lastScrollOffset)){
                    var currentScrollOffset = self.$uiScrollpoint.getScrollOffset();
                    return lastScrollOffset - currentScrollOffset;
                }
                return 0;
            };
            this.calculateTopPosition = function(){
                /**
                var topPosition = self.$element[0].offsetTop;
                var distance = self.currentScrollDistance();
                if(distance){
                    topPosition -= distance;
                }
                return topPosition;
                */

                var bounds = self.$element[0].getBoundingClientRect();
                var topPosition = bounds.top + self.$uiScrollpoint.getScrollOffset();
                if(!self.overflow || !self.shouldOverflow() || !self.overflow.amount){
                    topPosition -= self.currentScrollDistance();
                }

                return topPosition;
            };

            this.recalibratePosition = function(){
                self.$uiScrollpoint.$target.triggerHandler('scroll');
                $timeout(function(){
                    if(self.edge && self.$placeholder){
                        var scroll_edge = self.edge.scroll;
                        var element_edge = self.edge.element;
                        var edge = self.$uiScrollpoint.getEdge(scroll_edge, element_edge);
                        var bounds = self.$element[0].getBoundingClientRect();
                        var top = bounds.top;

                        var stackTarget = self.stack ? self.stack.getStackTarget(self, scroll_edge) : undefined;
                        if(stackTarget){
                            var stBounds = stackTarget.$element[0].getBoundingClientRect();
                            var stOffset = stBounds.top;
                            if(scroll_edge != 'bottom'){
                                stOffset += stackTarget.$element[0].offsetHeight;
                            }
                            else {
                                stOffset -= self.$element[0].offsetHeight;
                            }
                            if(edge.shift){
                                stOffset -= edge.shift;
                            }
                            top = stOffset;
                        }

                        if(bounds.top != top){
                            var topDiff = top - bounds.top;

                            self.$element.css('top', (self.$element[0].offsetTop + topDiff)+'px');

                            if(self.stack){
                                self.stack.recalibrateStacked(self, scroll_edge);
                            }
                        }
                    }
                });
            };

            this.repositionPinned = function(){
                if(self.$placeholder && self.$uiScrollpoint && !self.$uiScrollpoint.hasTarget){
                    var scrollDistance = self.currentScrollDistance();
                    var cTop = self.$element[0].offsetTop;
                    var nTop = cTop - scrollDistance;

                    // ensure the stackedOn is set if there are stackTargets
                    if(self.stack && !self.stackedOn && self.edge && self.edge.scroll && self.stackTargets[self.edge.scroll] && self.stackTargets[self.edge.scroll].length){
                        self.stack.assignStacked(self, self.edge.scroll);
                        if(self.overflow && self.stackedOn){
                            self.passOverflow(self.overflow);
                        }
                    }

                    if(self.overflow){
                        //console.log('['+self.$element[0].innerHTML+'] HAS OVERFLOW ['+self.overflow.root.$element[0].innerHTML+'] @ '+self.overflow.amount+' / '+self.overflow.allowance);
                        
                        if(self.shouldOverflow()){
                            var offset = -scrollDistance;

                            // ensure overflow amount will not exceed allowance with this offset
                            if(self.overflow.amount + offset > self.overflow.allowance){
                                offset = self.overflow.allowance - self.overflow.amount;
                            }
                            nTop -= offset;

                            var myTop = nTop;

                            // make sure we stick to our target
                            if(self.stackedOn){
                                var targetTop = self.stackedOn.calculateTopPosition();
                                var targetBottom = targetTop + self.stackedOn.$element[0].offsetHeight;

                                if(myTop > targetBottom){
                                    var diff = myTop - targetBottom;
                                    myTop -= diff;
                                    nTop -= diff;
                                }
                            }

                            // overflow root can update the overflow amount
                            if(self.overflow.root == self){
                                self.overflow.amount += offset;
                                if(self.overflow.amount < 0){
                                    self.overflow.amount = 0;
                                }
                            }
                        }
                    }

                    if(cTop != nTop){
                        self.$element.css('top', nTop+'px');
                    }
                    lastScrollOffset = self.$uiScrollpoint.getScrollOffset();

                    $timeout(function(){
                        self.calculateScrollAllowance();
                    });
                }
            };

            this.shouldOverflow = function(){
                return (self.overflow && self.stackedUnderGroup(self.overflow.root.stackGroup));
            };

            this.calculateScrollAllowance = function(){
                var passOverflow = false;
                if(!self.stackedUnder || !self.stackedUnder.length){
                    // only bottom elements should give an allowance
                    var bounds = self.$element[0].getBoundingClientRect();
                    var targetHeight = self.$uiScrollpoint.getTargetHeight();
                    var bottom = bounds.bottom + (self.overflow ? self.overflow.amount : 0);

                    var allowance = (bottom > targetHeight) ? bottom - targetHeight : 0;

                    if(allowance && (angular.isUndefined(self.overflow) || self.overflow.allowance != allowance)){
                        if(angular.isUndefined(self.overflow)){
                            self.overflow = { root: self, amount: 0 };
                            passOverflow = true;
                        }
                        self.overflow.allowance = allowance;
                    }
                }
                if(passOverflow){
                    self.passOverflow(self.overflow);
                }
            };
            this.passOverflow = function(overflow){
                if(self.edge){
                    var stackTop = self.stack.getStackTop(self, self.edge.scroll);
                    if(stackTop && stackTop != self){
                        stackTop.setOverflow(overflow);
                    }
                }
            };
            this.setOverflow = function(overflow){
                self.overflow = overflow;
                if(self.stackedUnder){
                    for(var i=0; i < self.stackedUnder.length; i++){
                        self.stackedUnder[i].setOverflow(overflow);
                    }
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

                // override the checkOffset
                origCheckOffset = this.$uiScrollpoint.checkOffset;
                this.$uiScrollpoint.checkOffset = this.checkOffset;

                this.$uiScrollpoint.cachePosition = function(){
                    if(self.isPinned()){
                        return;
                    }
                    this.posCache.top = this.getElementTop(true);
                };
            };
            this.setStackAgainst = function(stackId){
                if(stackId && !angular.isArray(stackId)){
                    stackId = [stackId];
                }
                this.stackAgainst = stackId;
            };
            this.setStackGroup = function(stackId){
                if(stackId && !angular.isArray(stackId)){
                    stackId = [stackId];
                }
                this.stackGroup = stackId;
            };
            this.stackedUnderGroup = function(stackGroup){
                if(self.stackGroupMatches(stackGroup, true)){
                    return true;
                }
                var parent = self;
                while((parent = parent.stackedOn)){
                    if(parent.stackedUnderGroup(stackGroup)){
                        return true;
                    }
                }
                return false;
            };
            this.stackGroupMatches = function(stackGroup, exclusive){
                if(stackGroup && this.stackGroup){
                    // does it match stackGroup
                    for(var i=0; i < this.stackGroup.length; i++){
                        if(stackGroup.indexOf(this.stackGroup[i]) != -1){
                            return true;
                        }
                    }
                }
                else if(angular.isUndefined(this.stackGroup) && !exclusive){
                    // no specific stack group - stack against anything
                    return true;
                }

                // didn't match the stackGroup, check if it should stackAgainst it
                if(this.stackAgainst && !exclusive){
                    for(var i=0; i < this.stackAgainst.length; i++){
                        if(this.stackAgainst[i] == '*' || (stackGroup && stackGroup.indexOf(this.stackAgainst[i]) != -1)){
                            return true;
                        }
                    }
                }

                // it is in a stackGroup, but doesn't match stackGroup at all
                return false;
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
                return ( (self.$placeholder) ? true : false );
            };

            this.pin = function(scroll_edge, elem_edge, distance){
                if(!this.$placeholder && this.$element && this.$uiScrollpoint){
                    // determine absolute position
                    var pos = {
                        x: this.$element[0].offsetLeft,
                        y: this.$element[0].offsetTop + distance * ((scroll_edge == 'bottom')?-1.0:1.0)
                    };

                    self.$uiScrollpoint.cachePosition();

                    // create an invisible placeholder
                    this.$placeholder = this.$element.clone();
                    this.$placeholder.addClass('placeholder');
                    this.$placeholder.css('visibility', 'hidden');
                    this.$element.after(this.$placeholder);

                    if(this.$uiScrollpoint.hasTarget){
                        // in case it is not a direct child of target, move it into the target when it's pinned
                        pinToTarget = (this.$uiScrollpoint.$target != this.$element.parent());

                        var bounds = this.$element[0].getBoundingClientRect();
                        var targetBounds = this.$uiScrollpoint.$target[0].getBoundingClientRect();

                        pos.x = bounds.left;
                        pos.y = this.$uiScrollpoint.$target[0].offsetTop + (bounds.top-targetBounds.top) + distance * ((scroll_edge == 'bottom')?-1.0:1.0);

                        if(pinToTarget){
                            this.$uiScrollpoint.$target.append(this.$element);
                        }
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
                    this.$element.css('left', pos.x+'px');
                    this.$element.css('top', pos.y+'px');

                    // keep track of which edge
                    this.edge = {scroll: scroll_edge, element: elem_edge};

                    // adjust the element's absolute top whenever target scrolls
                    lastScrollOffset = this.$uiScrollpoint.getScrollOffset();
                    this.$uiScrollpoint.$target.on('scroll', self.repositionPinned);

//                    this.$uiScrollpoint.$target.on('resize', self.calculateScrollAllowance);
                    $timeout(function(){
                        self.calculateScrollAllowance();
                    }, 1);

                    // notify the Pin service that it is pinned
                    Pin.pinned(this, this.edge, distance);
                }
            };

            this.unpin = function(){
                if(this.$placeholder && this.$element && this.$uiScrollpoint){
                    // stop adjusting absolute position when target scrolls
                    this.$uiScrollpoint.$target.off('scroll', self.repositionPinned);
                    lastScrollOffset = undefined;

//                    this.$uiScrollpoint.$target.off('resize', self.calculateScrollAllowance);
                    if(this.overflow){
                        this.passOverflow(undefined);
                    }
                    this.overflow = undefined;
                    
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

                    // destroy the placeholder
                    this.$placeholder.remove();
                    this.$placeholder = undefined;
                    
                    // notify the Pin service that it is unpinned
                    Pin.unpinned(this, edge);
                }
            };

            // custom checkOffset so we can check against stacking
            this.checkOffset = function(scroll_edge, elem_edge, edge){
                // in here, this is refering to the uiScrollpoint, self is referring to the uiScrollpointPin
                var offset;
                if(!edge){
                    edge = this.default_edge;
                }

                var stackTarget;
                if(self.stack){
                    stackTarget = self.stack.getStackTarget(self, scroll_edge);
                }

                var scroll_bottom = (scroll_edge == 'bottom');
                var elem_top = (elem_edge == 'top');
                var elem_bottom = (elem_edge == 'bottom');

                var scrollOffset = this.getScrollOffset();
                if(scroll_bottom){
                    scrollOffset += this.getTargetHeight();
                }

                var checkOffset;
                if(edge.absolute){
                    if(edge.percent){
                        checkOffset = edge.shift / 100.0 * this.getTargetScrollHeight();
                    }
                    else{
                        checkOffset = edge.shift;
                    }
                    if(scroll_bottom){
                        checkOffset = this.getTargetContentHeight() - checkOffset;
                        if(this.hasTarget){
                            checkOffset += this.getTargetHeight();
                        }
                    }
                }
                else{
                    if(elem_top){
                        checkOffset = this.getElementTop();
                    }
                    else if(elem_bottom){
                        checkOffset = this.getElementBottom();
                    }
                    checkOffset += edge.shift;
                    
                    if(stackTarget){
                        scrollOffset = stackTarget.calculateTopPosition() + (!scroll_bottom ? stackTarget.$element[0].offsetHeight : 0);

                        if(this.hasTarget){
                            scrollOffset = stackTarget.$element[0].offsetTop + (!scroll_bottom ? stackTarget.$element[0].offsetHeight : 0);
                            scrollOffset += (this.getScrollOffset() - this.$target[0].offsetTop);
                        }
                    }
                }

                offset = (scrollOffset - checkOffset);
                if(scroll_bottom){
                    offset *= -1.0;
                }
                return offset;
            };

        }],
        link: function (scope, elm, attrs , Ctrl){
            var uiScrollpoint = Ctrl[0];
            var uiScrollpointPin = Ctrl[1];

            var groupId;
            var stackId;

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

            // ui-scrollpoint-pin-stack attribute
            attrs.$observe('uiScrollpointPinStack', function(pinStack){
                if(pinStack){
                    stackId = pinStack.replace(/[^a-zA-Z0-9-,]/g, '-').split(',');
                }
                else{
                    stackId = undefined;
                }
                uiScrollpointPin.setStackGroup(stackId);
            });

            // ui-scrollpoint-pin-stack-against attribute
            attrs.$observe('uiScrollpointPinStackAgainst', function(pinStackAgainst){
                if(pinStackAgainst){
                    stackId = pinStackAgainst.replace(/[^a-zA-Z0-9-,\*]/g, '-').split(',');
                }
                else{
                    stackId = undefined;
                }
                uiScrollpointPin.setStackAgainst(stackId);
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
                uiScrollpointPin.unpin();
                $timeout(function(){
                    uiScrollpoint.$target.triggerHandler('scroll');
                }, 2);
            }
            scope.$on('scrollpointShouldReset', reset);
        }
    };
}]);
