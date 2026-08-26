angular.module('ui.bootstrap.offcanvas', ['ui.bootstrap.position'])

.constant('uibOffcanvasConfig', {
  backdrop: true,
  keyboard: true,
  scroll: false
})

// Coordinates "only one offcanvas open at a time" plus the shared
// document-level Escape listener and window-resize listener - both are
// attached lazily when something opens and detached once nothing is open,
// mirroring the singleton service pattern used by uibDropdownService.
.service('uibOffcanvasService', ['$document', '$window', function($document, $window) {
  var self = this;
  var openOffcanvas = null;

  this.isOpen = function(ctrl) {
    return openOffcanvas === ctrl;
  };

  this.open = function(ctrl) {
    var previous = openOffcanvas;
    openOffcanvas = ctrl;

    if (previous && previous !== ctrl) {
      previous.hide();
    }

    if (!previous) {
      $document.on('keydown', self.keydownListener);
      angular.element($window).on('resize', self.resizeListener);
    }
  };

  this.close = function(ctrl) {
    if (openOffcanvas !== ctrl) {
      return;
    }

    openOffcanvas = null;
    $document.off('keydown', self.keydownListener);
    angular.element($window).off('resize', self.resizeListener);
  };

  this.keydownListener = function(evt) {
    if (!openOffcanvas || evt.which !== 27) {
      return;
    }

    if (openOffcanvas.getKeyboard()) {
      openOffcanvas.hide();
    } else {
      openOffcanvas.hidePrevented();
    }
  };

  this.resizeListener = function() {
    if (!openOffcanvas) {
      return;
    }

    var el = openOffcanvas.getElement();
    if ($window.getComputedStyle(el[0]).position !== 'fixed') {
      openOffcanvas.hide();
    }
  };
}])

.controller('UibOffcanvasController', ['$scope', '$element', '$attrs', '$parse', '$animate', '$document', '$uibPosition',
  'uibOffcanvasConfig', 'uibOffcanvasService',
  function($scope, $element, $attrs, $parse, $animate, $document, $uibPosition, offcanvasConfig, offcanvasService) {
    var self = this;
    var isShown = false;
    var backdropElement = null;
    var scrollbarPadding = null;
    var relatedTarget = null;
    var getIsOpen, setIsOpen = angular.noop;

    var showExpr = $parse($attrs.onShow);
    var shownExpr = $parse($attrs.onShown);
    var hideExpr = $parse($attrs.onHide);
    var hiddenExpr = $parse($attrs.onHidden);
    var hidePreventedExpr = $parse($attrs.onHidePrevented);

    var tabbableSelector = 'a[href], area[href], input:not([disabled]):not([tabindex=\'-1\']), ' +
      'button:not([disabled]):not([tabindex=\'-1\']),select:not([disabled]):not([tabindex=\'-1\']), textarea:not([disabled]):not([tabindex=\'-1\']), ' +
      'iframe, object, embed, *[tabindex]:not([tabindex=\'-1\']), *[contenteditable=true]';

    $element.addClass('offcanvas');

    this.init = function() {
      if ($attrs.isOpen) {
        getIsOpen = $parse($attrs.isOpen);
        setIsOpen = getIsOpen.assign;

        $scope.$watch(getIsOpen, function(value) {
          if (!!value !== isShown) {
            self.toggle(!!value);
          }
        });
      }
    };

    this.getElement = function() {
      return $element;
    };

    this.isShown = function() {
      return isShown;
    };

    this.getBackdrop = function() {
      return angular.isDefined($attrs.backdrop) ? $scope.$eval($attrs.backdrop) : offcanvasConfig.backdrop;
    };

    this.getKeyboard = function() {
      return angular.isDefined($attrs.keyboard) ? !!$scope.$eval($attrs.keyboard) : offcanvasConfig.keyboard;
    };

    this.getScroll = function() {
      return angular.isDefined($attrs.scroll) ? !!$scope.$eval($attrs.scroll) : offcanvasConfig.scroll;
    };

    this.toggle = function(open) {
      var shouldShow = arguments.length ? !!open : !isShown;
      if (shouldShow) {
        self.show();
      } else {
        self.hide();
      }
    };

    this.show = function(related) {
      if (isShown) {
        return;
      }

      relatedTarget = related || null;
      showExpr($scope, { relatedTarget: relatedTarget });

      isShown = true;
      updateBoundIsOpen(true);

      if (self.getBackdrop()) {
        createBackdrop();
      }

      if (!self.getScroll()) {
        lockScroll();
      }

      $element.attr({ 'aria-modal': 'true', role: 'dialog' });
      $element.attr('tabindex', $element.attr('tabindex') || '-1');

      offcanvasService.open(self);

      // Wait for exactly one transition (triggered by adding 'showing'),
      // matching real Bootstrap's single _queueCallback per direction. The
      // final class swap below is a plain, instant classList mutation --
      // NOT a second $animate-mediated wait -- since 'showing' and 'show'
      // map to the same CSS state (transform: none) and nothing should
      // visually change between them.
      $animate.addClass($element, 'showing').then(function() {
        $element.addClass('show');
        $element.removeClass('showing');
        activateFocusTrap();
        shownExpr($scope, { relatedTarget: relatedTarget });
      });
    };

    this.hide = function() {
      if (!isShown) {
        return;
      }

      // Captured now: relatedTarget could be overwritten by a subsequent
      // show() before this hide's animation chain resolves.
      var toggleToRefocus = relatedTarget;

      hideExpr($scope);
      deactivateFocusTrap();

      if ($document[0].activeElement && $element[0].contains($document[0].activeElement)) {
        $document[0].activeElement.blur();
      }

      isShown = false;
      updateBoundIsOpen(false);

      // Start the backdrop fade-out in parallel with the panel's own
      // slide-out transition (matches real Bootstrap's hide(), which calls
      // this._backdrop.hide() immediately rather than waiting for the
      // panel's transition to finish first) -- otherwise the backdrop stays
      // fully opaque for the whole slide-out and only starts fading once
      // the panel is already gone, which reads as a flash/flicker.
      removeBackdrop();

      // Wait for exactly one transition (triggered by adding 'hiding' while
      // 'show' is still present), matching real Bootstrap's single
      // _queueCallback per direction. The final cleanup below is a plain,
      // instant classList mutation, not a second $animate-mediated wait.
      $animate.addClass($element, 'hiding').then(function() {
        $element.removeClass('show hiding');
        $element.removeAttr('aria-modal');
        $element.removeAttr('role');

        if (!self.getScroll()) {
          unlockScroll();
        }

        offcanvasService.close(self);
        hiddenExpr($scope);

        if (toggleToRefocus && toggleToRefocus.focus) {
          toggleToRefocus.focus();
        }
      });
    };

    this.hidePrevented = function() {
      hidePreventedExpr($scope);
    };

    function updateBoundIsOpen(value) {
      if (angular.isFunction(setIsOpen)) {
        setIsOpen($scope, value);
      }
    }

    // Backdrop is a plain compiled element, not a directive/template -
    // simplified version of what modal.js does for its backdrop, without
    // the stacking bookkeeping (offcanvas never has more than one open).
    function createBackdrop() {
      // 'fade' is what real Bootstrap's Backdrop._getElement() adds when
      // isAnimated is true -- it's the class that actually *defines* the
      // opacity transition CSS rule. Without it there's no transition at
      // all, so $animate finds nothing to wait for and the backdrop just
      // vanishes instantly instead of fading out alongside the panel.
      backdropElement = angular.element('<div class="offcanvas-backdrop fade"></div>');
      $animate.enter(backdropElement, $document.find('body'));
      $animate.addClass(backdropElement, 'show');

      backdropElement.on('click', function() {
        if (self.getBackdrop() === 'static') {
          self.hidePrevented();
        } else {
          $scope.$apply(function() {
            self.hide();
          });
        }
      });
    }

    function removeBackdrop() {
      if (!backdropElement) {
        return;
      }

      var el = backdropElement;
      backdropElement = null;
      $animate.removeClass(el, 'show').then(function() {
        $animate.leave(el);
      });
    }

    // Body scroll lock. NOTE: this does not coordinate with
    // $uibModalStack's independent scroll-lock mechanism - each blindly
    // sets/restores body overflow/paddingRight without a shared refcount,
    // so a modal opened while an offcanvas is open (or vice versa) can
    // clobber the other's restore value on close. No shared scroll-lock
    // utility exists in the codebase to reuse; not solving that here.
    function lockScroll() {
      var body = $document.find('body');
      scrollbarPadding = $uibPosition.scrollbarPadding(body);

      if (scrollbarPadding.heightOverflow && scrollbarPadding.scrollbarWidth) {
        body.css('paddingRight', scrollbarPadding.right + 'px');
      }

      body.css('overflow', 'hidden');
    }

    function unlockScroll() {
      var body = $document.find('body');
      body.css('overflow', '');

      if (scrollbarPadding) {
        body.css('paddingRight', scrollbarPadding.originalRight ? scrollbarPadding.originalRight + 'px' : '');
        scrollbarPadding = null;
      }
    }

    // Focus trap is scoped to this element's own keydown listener (not
    // document-level like modal.js's stack-aware version) because
    // uibOffcanvasService guarantees only one offcanvas is ever shown at a
    // time, so there's no stacking concern to handle.
    function isVisible(element) {
      return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    function focusableElements() {
      var elements = $element[0].querySelectorAll(tabbableSelector);
      return Array.prototype.filter.call(elements, isVisible);
    }

    function trapFocusListener(evt) {
      if (evt.which !== 9) {
        return;
      }

      var list = focusableElements();
      if (!list.length) {
        evt.preventDefault();
        return;
      }

      var first = list[0];
      var last = list[list.length - 1];
      var active = $document[0].activeElement;

      if (evt.shiftKey && active === first) {
        evt.preventDefault();
        last.focus();
      } else if (!evt.shiftKey && active === last) {
        evt.preventDefault();
        first.focus();
      } else if (!$element[0].contains(active)) {
        evt.preventDefault();
        first.focus();
      }
    }

    function activateFocusTrap() {
      var list = focusableElements();
      if (list.length) {
        list[0].focus();
      } else {
        $element[0].focus();
      }

      $element.on('keydown', trapFocusListener);
    }

    function deactivateFocusTrap() {
      $element.off('keydown', trapFocusListener);
    }

    $scope.$on('$destroy', function() {
      if (isShown) {
        self.hide();
      }

      offcanvasService.close(self);
    });
  }])

.directive('uibOffcanvas', function() {
  return {
    controller: 'UibOffcanvasController',
    link: function(scope, element, attrs, offcanvasCtrl) {
      offcanvasCtrl.init();
    }
  };
})

// Deliberately does NOT `require: '^uibOffcanvas'` - real Bootstrap's
// data-bs-toggle="offcanvas" targets an offcanvas anywhere in the document
// by id, not necessarily an ancestor. Resolve the target element by CSS
// selector instead and fetch its controller the same way Angular itself
// does internally, via element.controller(directiveName).
.directive('uibOffcanvasToggle', ['$document', function($document) {
  return {
    link: function(scope, element, attrs) {
      element.on('click', toggleOffcanvas);

      scope.$on('$destroy', function() {
        element.off('click', toggleOffcanvas);
      });

      function toggleOffcanvas(evt) {
        evt.preventDefault();

        var targetSelector = attrs.uibOffcanvasToggle || attrs.target;
        var targetEl = targetSelector ?
          angular.element($document[0].querySelector(targetSelector)) : null;
        var offcanvasCtrl = targetEl && targetEl.length ? targetEl.controller('uibOffcanvas') : null;

        if (!offcanvasCtrl) {
          return;
        }

        scope.$apply(function() {
          if (offcanvasCtrl.isShown()) {
            offcanvasCtrl.hide();
          } else {
            offcanvasCtrl.show(element[0]);
          }
        });
      }
    }
  };
}])

.directive('uibOffcanvasDismiss', function() {
  return {
    require: '^uibOffcanvas',
    link: function(scope, element, attrs, offcanvasCtrl) {
      element.on('click', dismissOffcanvas);

      scope.$on('$destroy', function() {
        element.off('click', dismissOffcanvas);
      });

      function dismissOffcanvas(evt) {
        evt.preventDefault();
        scope.$apply(function() {
          offcanvasCtrl.hide();
        });
      }
    }
  };
});
