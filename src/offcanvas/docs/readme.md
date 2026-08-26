Offcanvas is a sidebar component that can be toggled to appear from the edge of the viewport, similar to Bootstrap's own offcanvas component.

This directive is composed by three parts:

* `uib-offcanvas` which transforms a node into an offcanvas panel.
* `uib-offcanvas-toggle` which toggles a target offcanvas panel by CSS selector, similar to Bootstrap's `data-bs-toggle="offcanvas"`.
* `uib-offcanvas-dismiss` which closes the containing offcanvas panel, similar to Bootstrap's `data-bs-dismiss="offcanvas"`.

Each of these parts need to be used as attribute directives.

### uib-offcanvas settings

* `backdrop`
  _(Default: `true`)_ -
  Controls the backdrop behavior. `true` shows a backdrop that closes the offcanvas on click; `false` shows no backdrop; `'static'` shows a backdrop that does not close the offcanvas on click (fires `on-hide-prevented` instead).

* `is-open`
  <small class="badge">$</small>
  _(Default: `false`)_ -
  Defines whether or not the offcanvas is shown. The `uib-offcanvas-toggle` will toggle this attribute on click.

* `keyboard`
  _(Default: `true`)_ -
  Whether pressing the Escape key closes the offcanvas. When `false`, Escape fires `on-hide-prevented` instead of closing.

* `on-hide()`
  An optional expression called when the offcanvas begins hiding.

* `on-hidden()`
  An optional expression called after the offcanvas has finished hiding and its backdrop and scroll lock have been removed.

* `on-hide-prevented()`
  An optional expression called when a static-backdrop click or an Escape press (with `keyboard="false"`) attempts to close the offcanvas but is prevented.

* `on-show()`
  An optional expression called when the offcanvas begins showing.

* `on-shown()`
  An optional expression called after the offcanvas has finished showing and focus has moved into it.

* `scroll`
  _(Default: `false`)_ -
  Whether body scrolling remains enabled while the offcanvas is shown. By default (`false`) body scroll is locked and the scrollbar width is compensated for via padding.

### uib-offcanvas-toggle settings

* `uib-offcanvas-toggle="selector"` -
  CSS selector (e.g. `"#my-offcanvas"`) identifying the `uib-offcanvas` element to toggle.

### Known issues

* Only one offcanvas can be shown at a time; opening a new one automatically hides any other that is open.
* The body scroll lock does not coordinate with `$uibModal`'s independent scroll-lock mechanism -- opening a modal and an offcanvas at the same time may cause one to clobber the other's restored `padding-right`/`overflow` on close.
