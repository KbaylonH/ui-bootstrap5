describe('uib-offcanvas', function() {
  var $animate, $compile, $rootScope, $document, $window, element, elements;

  beforeEach(module('ngAnimateMock'));
  beforeEach(module('ui.bootstrap.offcanvas'));

  beforeEach(inject(function(_$animate_, _$compile_, _$rootScope_, _$document_, _$window_) {
    $animate = _$animate_;
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $document = _$document_;
    $window = _$window_;
  }));

  beforeEach(function() {
    elements = [];
  });

  afterEach(function() {
    elements.forEach(function(el) {
      el.remove();
    });
    $document.find('.offcanvas-backdrop').remove();
    angular.element(document.body).css({ overflow: '', paddingRight: '' });
  });

  function flushAnimations() {
    for (var i = 0; i < 10; i++) {
      $rootScope.$digest();
      try {
        $animate.flush();
      } catch (e) {
        if (!/no pending animations/i.test(e.message || '')) {
          throw e;
        }
        break;
      }
    }
    $rootScope.$digest();
  }

  var triggerKeyDown = function(el, keyCode, extra) {
    var e = $.Event('keydown');
    e.which = keyCode;
    angular.extend(e, extra || {});
    el.trigger(e);
    return e;
  };

  function compileOffcanvas(html, scope) {
    scope = scope || $rootScope.$new();
    var compiled = $compile(html)(scope);
    $document.find('body').append(compiled);
    elements.push(compiled);
    return compiled;
  }

  function basicOffcanvasHtml(id, extraAttrs) {
    return '<div uib-offcanvas id="' + id + '" is-open="isOpen" ' +
      'on-show="onShow()" on-shown="onShown()" on-hide="onHide()" on-hidden="onHidden()" on-hide-prevented="onHidePrevented()" ' +
      (extraAttrs || '') + '>' +
      '<div class="offcanvas-header"><button type="button" class="btn-close" uib-offcanvas-dismiss></button></div>' +
      '<div class="offcanvas-body">' +
      '<a href="#" class="link-1">Link 1</a>' +
      '<a href="#" class="link-2">Link 2</a>' +
      '</div></div>';
  }

  describe('basic show/hide/toggle', function() {
    var scope;

    beforeEach(function() {
      scope = $rootScope.$new();
      scope.isOpen = false;
      element = compileOffcanvas(basicOffcanvasHtml('oc-basic'), scope);
    });

    it('starts hidden', function() {
      expect(element).not.toHaveClass('show');
      expect(element.attr('aria-modal')).toBeUndefined();
    });

    it('shows when is-open becomes true, and hides when set back to false', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect(element).toHaveClass('show');
      expect(element.attr('aria-modal')).toBe('true');
      expect(element.attr('role')).toBe('dialog');

      scope.isOpen = false;
      scope.$digest();
      flushAnimations();
      expect(element).not.toHaveClass('show');
      expect(element.attr('aria-modal')).toBeUndefined();
      expect(element.attr('role')).toBeUndefined();
    });

    it('adds the showing class before settling on show', function() {
      scope.isOpen = true;
      scope.$digest();
      expect(element).toHaveClass('showing');
      flushAnimations();
      expect(element).toHaveClass('show');
      expect(element).not.toHaveClass('showing');
    });

    it('hides via uib-offcanvas-dismiss and updates the is-open binding', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      element.find('[uib-offcanvas-dismiss]').click();
      scope.$digest();
      flushAnimations();

      expect(scope.isOpen).toBe(false);
      expect(element).not.toHaveClass('show');
    });
  });

  describe('backdrop', function() {
    var scope;

    beforeEach(function() {
      scope = $rootScope.$new();
      scope.isOpen = false;
    });

    it('creates and removes a backdrop element by default', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-bd'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect($document.find('.offcanvas-backdrop').length).toBe(1);

      scope.isOpen = false;
      scope.$digest();
      flushAnimations();
      expect($document.find('.offcanvas-backdrop').length).toBe(0);
    });

    it('creates no backdrop when backdrop="false"', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-bd2', 'backdrop="false"'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect($document.find('.offcanvas-backdrop').length).toBe(0);
    });

    it('hides on backdrop click by default', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-bd3'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      $document.find('.offcanvas-backdrop').click();
      flushAnimations();

      expect(element).not.toHaveClass('show');
      expect(scope.isOpen).toBe(false);
    });

    it('does not hide on backdrop click when backdrop is static, and fires on-hide-prevented', function() {
      scope.onHidePrevented = jasmine.createSpy('onHidePrevented');
      element = compileOffcanvas(basicOffcanvasHtml('oc-bd4', 'backdrop="\'static\'"'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      $document.find('.offcanvas-backdrop').click();
      flushAnimations();

      expect(element).toHaveClass('show');
      expect(scope.onHidePrevented).toHaveBeenCalled();
    });
  });

  describe('keyboard', function() {
    var scope;

    beforeEach(function() {
      scope = $rootScope.$new();
      scope.isOpen = false;
    });

    it('hides on Escape by default', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-kb'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      triggerKeyDown($document, 27);
      flushAnimations();

      expect(element).not.toHaveClass('show');
    });

    it('does not hide on Escape when keyboard="false", and fires on-hide-prevented', function() {
      scope.onHidePrevented = jasmine.createSpy('onHidePrevented');
      element = compileOffcanvas(basicOffcanvasHtml('oc-kb2', 'keyboard="false"'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      triggerKeyDown($document, 27);
      flushAnimations();

      expect(element).toHaveClass('show');
      expect(scope.onHidePrevented).toHaveBeenCalled();
    });
  });

  describe('scroll lock', function() {
    var scope;

    beforeEach(function() {
      scope = $rootScope.$new();
      scope.isOpen = false;
    });

    it('locks body scroll by default', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-scroll'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect(angular.element(document.body).css('overflow')).toBe('hidden');

      scope.isOpen = false;
      scope.$digest();
      flushAnimations();
      expect(angular.element(document.body).css('overflow')).not.toBe('hidden');
    });

    it('does not lock body scroll when scroll="true"', function() {
      element = compileOffcanvas(basicOffcanvasHtml('oc-scroll2', 'scroll="true"'), scope);
      var before = angular.element(document.body).css('overflow');
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect(angular.element(document.body).css('overflow')).toBe(before);
    });
  });

  describe('focus trap', function() {
    var scope;

    beforeEach(function() {
      scope = $rootScope.$new();
      scope.isOpen = false;
      element = compileOffcanvas(basicOffcanvasHtml('oc-focus'), scope);
    });

    it('moves focus to the first focusable element when shown', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect(element.find('[uib-offcanvas-dismiss]')).toHaveFocus();
    });

    it('wraps Tab from the last focusable element to the first', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      element.find('.link-2')[0].focus();
      triggerKeyDown(element, 9);
      expect(element.find('[uib-offcanvas-dismiss]')).toHaveFocus();
    });

    it('wraps Shift+Tab from the first focusable element to the last', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      element.find('[uib-offcanvas-dismiss]')[0].focus();
      triggerKeyDown(element, 9, { shiftKey: true });
      expect(element.find('.link-2')).toHaveFocus();
    });

    it('stops trapping focus after hide', function() {
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      scope.isOpen = false;
      scope.$digest();
      flushAnimations();

      element.find('.link-2')[0].focus();
      var evt = triggerKeyDown(element, 9);
      expect(evt.isDefaultPrevented()).toBe(false);
    });
  });

  describe('uib-offcanvas-toggle', function() {
    it('toggles the target offcanvas found by CSS selector and returns focus to itself on hide', function() {
      var scope = $rootScope.$new();
      var toggleBtn = compileOffcanvas('<button uib-offcanvas-toggle="#oc-toggle-target">Open</button>', scope);
      element = compileOffcanvas(basicOffcanvasHtml('oc-toggle-target'), scope);

      toggleBtn.click();
      scope.$digest();
      flushAnimations();
      expect(element).toHaveClass('show');

      toggleBtn.click();
      scope.$digest();
      flushAnimations();

      expect(element).not.toHaveClass('show');
      expect(toggleBtn).toHaveFocus();
    });
  });

  describe('only one open at a time', function() {
    it('hides a previously shown offcanvas when another one is opened', function() {
      var scope1 = $rootScope.$new();
      var scope2 = $rootScope.$new();
      scope1.isOpen = false;
      scope2.isOpen = false;
      var oc1 = compileOffcanvas(basicOffcanvasHtml('oc-one-1'), scope1);
      var oc2 = compileOffcanvas(basicOffcanvasHtml('oc-one-2'), scope2);

      scope1.isOpen = true;
      scope1.$digest();
      flushAnimations();
      expect(oc1).toHaveClass('show');

      scope2.isOpen = true;
      scope2.$digest();
      flushAnimations();

      expect(oc2).toHaveClass('show');
      expect(oc1).not.toHaveClass('show');
      expect(scope1.isOpen).toBe(false);
    });
  });

  describe('resize auto-hide', function() {
    it('hides a shown offcanvas whose computed position is no longer fixed on window resize', function() {
      var scope = $rootScope.$new();
      scope.isOpen = false;
      element = compileOffcanvas(basicOffcanvasHtml('oc-resize'), scope);
      scope.isOpen = true;
      scope.$digest();
      flushAnimations();
      expect(element).toHaveClass('show');

      angular.element($window).triggerHandler('resize');
      flushAnimations();

      expect(element).not.toHaveClass('show');
    });

    it('does not error when resize fires with nothing open', function() {
      expect(function() {
        angular.element($window).triggerHandler('resize');
      }).not.toThrow();
    });
  });

  describe('destroy cleanup', function() {
    it('hides and releases the singleton slot when the scope is destroyed while shown', function() {
      var scope1 = $rootScope.$new();
      scope1.isOpen = false;
      compileOffcanvas(basicOffcanvasHtml('oc-destroy-1'), scope1);
      scope1.isOpen = true;
      scope1.$digest();
      flushAnimations();

      scope1.$destroy();

      var scope2 = $rootScope.$new();
      scope2.isOpen = false;
      var oc2 = compileOffcanvas(basicOffcanvasHtml('oc-destroy-2'), scope2);
      scope2.isOpen = true;
      scope2.$digest();
      flushAnimations();

      expect(oc2).toHaveClass('show');
    });
  });

  describe('lifecycle callbacks', function() {
    it('fires on-show/on-shown/on-hide/on-hidden exactly once per cycle, in order', function() {
      var scope = $rootScope.$new();
      var order = [];
      scope.isOpen = false;
      scope.onShow = function() { order.push('show'); };
      scope.onShown = function() { order.push('shown'); };
      scope.onHide = function() { order.push('hide'); };
      scope.onHidden = function() { order.push('hidden'); };

      element = compileOffcanvas(basicOffcanvasHtml('oc-cb'), scope);

      scope.isOpen = true;
      scope.$digest();
      flushAnimations();

      scope.isOpen = false;
      scope.$digest();
      flushAnimations();

      expect(order).toEqual(['show', 'shown', 'hide', 'hidden']);
    });
  });
});
