# Changelog

All notable changes to this project will be documented in this file.

## [2.0.6] - 2026-01-31

### Fixed

- **UI Regression**: Fixed broken style encapsulation for Header and Sidebar components.
- **Sidebar Layout**: Corrected flexbox display issues causing sidebar collapse.
- **Theming**: Restored "Glassmorphism" variables and transparency effects.
- **CSS Cleanup**: Removed ~600 lines of conflicting legacy styles.

## [2.0.5] - 2026-01-31

### Added

- Core architecture refactoring: Abstracted Tauri API interactions into a dedicated `TauriService`.
- Enhanced `TauriService` with methods for `clipboardWriteText`, `openUrl`, `saveDialog`, `openDialog`, `emit`, `getAppVersion`, and `setZoom`.
- Modularized `HomeComponent` into `HeaderComponent`, `SidebarComponent`, and `PlayerComponent` for better maintainability.
- Implemented "Apple Premium Design" aesthetics for the new modular components.

### Changed

- Refactored all components to use `TauriService` instead of direct `@tauri-apps/*` imports.
- Updated `CONTRIBUTING.md` with new architectural standards.
- Improved unit tests with robust mocks for centralized services.

### Fixed

- Fixed multiple failing unit tests caused by missing dependencies and incorrect mocks.
- Resolved Tauri API integration issues in several modals and tiles.
