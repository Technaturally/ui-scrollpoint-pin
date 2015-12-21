/*global describe, beforeEach, afterAll, module, inject, it, spyOn, expect, $, angular */
describe('uiScrollpointPin', function () {
  'use strict';

  var scope, $compile, $window;
  beforeEach(module('ui.scrollpoint.pin'));
  beforeEach(inject(function (_$rootScope_, _$compile_, _$window_) {
    scope = _$rootScope_.$new();
    $compile = _$compile_;
    $window = _$window_;
  }));
  
});
