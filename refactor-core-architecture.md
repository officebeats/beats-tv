# Task: Core Architecture Refactor & Modularization

## Status: 🟡 In Progress

## Goal: Simplify codebase for better open-source collaboration and maintainability.

---

## 📋 Phase 1: Tauri Abstraction

- [x] Create `src/app/services/tauri.service.ts`
- [x] Define interfaces for all IPC payloads. (Partially done in `src/app/models/ipc-payloads.ts`)
- [x] Wrap `invoke`, `listen`, and `emit`.
- [x] Refactor `AppComponent` to use `TauriService`.
- [x] Refactor `MemoryService` to use `TauriService`.
- [x] Refactor `SettingsComponent` to use `TauriService`.
- [x] Refactor `SetupComponent` to use `TauriService`.
- [x] Refactor `HomeComponent` to use `TauriService`.
- [x] Refactor `DownloadService` to use `TauriService`.
- [x] Refactor remaining components (Modals, Tiles, Validators) to use `TauriService`.

## 📋 Phase 2: HomeComponent Modularization

- [ ] Extract `HomeHeaderComponent`.
- [ ] Extract `BulkActionBarComponent`.
- [ ] Extract `MediaPillFilterComponent`.
- [ ] Extract `BreadcrumbComponent`.
- [ ] Update `HomeComponent` template to use new sub-components.

## 📋 Phase 3: Documentation & Verification

- [ ] Update `CONTRIBUTING.md` with new architectural standards.
- [ ] Ensure `npm test` passes for all new components.
- [ ] Perform a final repo cleanup of any lingering artifacts.

---

## 🛠️ Verification Criteria

1. `HomeComponent` logic is < 300 lines.
2. Zero direct Tauri API imports in `.ts` files (except services).
3. All unit tests pass.
