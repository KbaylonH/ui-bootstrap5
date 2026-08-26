angular.module('ui.bootstrap.demo').controller('OffcanvasCtrl', function($scope, $log) {
  $scope.isOpen = {
    default: false,
    static: false,
    scroll: false,
    noKeyboard: false
  };

  $scope.onShow = function(name) {
    $log.log('offcanvas "' + name + '" showing');
  };

  $scope.onShown = function(name) {
    $log.log('offcanvas "' + name + '" shown');
  };

  $scope.onHide = function(name) {
    $log.log('offcanvas "' + name + '" hiding');
  };

  $scope.onHidden = function(name) {
    $log.log('offcanvas "' + name + '" hidden');
  };

  $scope.onHidePrevented = function(name) {
    $log.log('offcanvas "' + name + '" hide prevented (static backdrop or keyboard disabled)');
  };
});
