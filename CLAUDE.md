# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is `ui-bootstrap4`, a fork of the original AngularJS `angular-ui/bootstrap` project, adapted to work with Bootstrap CSS instead of relying on jQuery/Bootstrap JS. The package name and history still say "bootstrap4", but the current branch (`bs5-datepicker-spike`) is actively porting components (datepicker, dropdown, tooltip, popover) to Bootstrap 5 markup/behavior, including replacing the legacy custom `position.js` positioning logic with real Popper.js v2 (loaded as the global `window.Popper`) for dropdown/tooltip/popover placement. When touching those modules, check recent commits first — this migration is in progress and incomplete.

The project has no build-time or runtime dependency on jQuery/Bootstrap JS; it reimplements Bootstrap's interactive behavior as pure AngularJS directives. The only intended dependencies are AngularJS and Bootstrap's CSS/markup conventions.

## Commands

```sh
npm test              # grunt default task: lint + html2js + karma tests + build dist
npm run demo           # build docs/demo assets and serve dist/ on :3857
npm run serve          # serve the already-built dist/ folder on :3857
npx grunt              # same as npm test
npx grunt eslint       # lint only (src/**/*.js and Gruntfile.js)
npx grunt html2js      # compile template/**/*.html into *.html.js (required before karma can run)
npx grunt build        # build dist/ bundles (all modules, or pass module names e.g. `grunt build:dropdown:tooltip`)
npx grunt build:<mod1>:<mod2>  # custom build containing only the given modules + their transitive deps
npx grunt karma:continuous     # run the full Jasmine suite once in Chrome (singleRun)
npx grunt watch        # rebuild + run karma in watch mode on src/template changes
```

There is no way to run a single spec file directly through grunt/karma config as-is; to focus on one module during development, temporarily narrow `files`/`preprocessors` in `karma.conf.js`, or just watch the console output for the relevant module's `describe` block.

Tests run in a real Chrome browser via Karma (`karma.conf.js`, `browsers: ['Chrome']`) — Chrome must be installed and discoverable. Firefox/Opera/Safari/PhantomJS-style headless configs exist for `karma:travis` / `karma:jenkins` if Chrome isn't available.

## Architecture

### Per-module layout

Each directive lives under `src/<module>/` with a consistent shape:
- `<module>.js` — the actual `angular.module('ui.bootstrap.<module>', [...])` definition (directives/services/controllers). Cross-module deps are declared in this array, e.g. `angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse', 'ui.bootstrap.tabindex'])`.
- `index.js` — a CommonJS/webpack entry point that `require()`s the module's own dependencies and compiled templates, then defines a `ui.bootstrap.module.<name>` wrapper module. This is what consumers import individually, e.g. `import accordion from 'ui-bootstrap4/src/accordion'`.
- `index-nocss.js` — same as `index.js` but without the CSS import, for modules that have stylesheets (dropdown, modal, tooltip, popover, datepicker, timepicker, typeahead, carousel, position).
- `docs/demo.html`, `docs/demo.js`, `docs/readme.md` — source content used to generate the public docs site build (`misc/demo/index.html` template pulls these in via the Gruntfile).
- `test/*.spec.js` — Jasmine specs, run by Karma.

Templates live separately under `template/<module>/*.html`. `grunt html2js` compiles each into a `*.html.js` file (git-ignored, generated) that registers the template string under an Angular module named `uib/template/<module>/<file>.html` — that's how `templateUrl: 'uib/template/accordion/accordion.html'` resolves at runtime without a network request.

### Build system (Gruntfile.js)

The Gruntfile dynamically discovers the module graph rather than hardcoding it: `findModule(name)` reads each module's own `.js` source, regex-extracts the `angular.module('ui.bootstrap.X', [...])` dependency array, and recursively pulls in any `ui.bootstrap.*` dependencies. This means **adding a dependency between two modules only requires declaring it in the target module's `angular.module([...])` array** — no separate registration is needed anywhere in the build config.

- `grunt build` (no args) builds every module in `src/*` into `dist/ui-bootstrap-<version>.js` (code only) and `dist/ui-bootstrap-tpls-<version>.js` (code + templates), plus minified variants and `dist/assets/module-mapping.json` / `dist/assets/raw-files.json` (used by the custom-build page on the docs site).
- `grunt build:foo:bar` builds a custom bundle containing only `foo`, `bar`, and their transitive `ui.bootstrap.*` dependencies.
- Per-module CSS files (`src/<module>/*.css`) get inlined into a generated `<style>`-injecting Angular `.run()` block (for CSP-friendly builds a separate `-csp.css` file is emitted instead).
- `before-test` = `eslint` + `html2js`; `after-test` = `build` + `copy` (demo/docs assets). The default `npm test` task runs `before-test`, `test` (karma), `after-test` in sequence.

### dist/ and docs/ are committed

Unlike most projects, `dist/` is **not** gitignored (see `.gitignore` — `# dist` is commented out) and is checked into the repo; `docs/` is a copy of `dist/` used for GitHub Pages. Changes to `src/` or `template/` must be followed by rebuilding (`grunt build` / `grunt after-test`) and committing the resulting `dist/` (and often `docs/`) changes alongside — see commits like `build: compile datepicker template dist after button style fix` for the expected pattern. `template/**/*.js` (the html2js output) is gitignored and regenerated on demand.

### Linting

Only ESLint (`.eslintrc`, run via `grunt eslint` over `Gruntfile.js` and `src/**/*.js`) is actually wired into the build. A `.jshintrc` file exists but is not referenced by any Grunt task — treat it as vestigial, not authoritative.
