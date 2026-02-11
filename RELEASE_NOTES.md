## ✨ Release v2.1.9

### ✅ UI Verified Fixed

- **Verified Layout**: Fixed the "broken layout" issue. Added automated Playwright testing during the build process to verify the Sidebar dimensions (90px) and Logo height (48px) are correctly applied.
- **Resilient Styling**: Fixed CSS selector collision by reverting to `ViewEncapsulation.Emulated` and adding `:host` layout protection.
- **CSP Optimization**: Updated Content Security Policy and disabled `inlineCritical` CSS loading to ensure stylesheets load immediately on all systems without being blocked by the WebView.

_(Includes improvements from v2.1.7 and v2.1.8)_

- **Content Filter Logic**: Fixed bug where deselecting all categories showed stale content.
- **Performance**: Optimized list reloading on filter toggles.
