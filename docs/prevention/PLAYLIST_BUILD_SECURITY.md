# Build Integrity & Playlist Safety Guide

## Problem Context

On 2026-02-07, the build broke comprehensively due to Angular compiler errors in `app.module.ts` and `home.component.ts`. The playlist failed to render because required properties (`filterChips`, `genreInput`, etc.) and methods were missing from the component implementation, despite being used in the template.

## Prevention Strategy: The "Zero-Assumption" Protocol

To prevent recurrence, we enforce the following rules before any commit:

### 1. Template-Logic Sync Check

**Rule:** If you add an element to an HTML template (e.g., `<mat-chip>`, `(click)="method()"`), you MUST immediately verify the corresponding logic exists in the `.ts` file.

**Checklist:**

- [ ] Does `app.module.ts` import the module for the component? (e.g., `MatChipsModule` for `<mat-chip>`)
- [ ] Does the component class implement every property bound with `[]` or `{{String}}`?
- [ ] Does the component class implement every method bound with `()`?

### 2. The Local Build Standard

**Rule:** Never assume code works because the IDE is quiet. The Angular compiler is the only source of truth.

**Run before verify:**

```bash
# Fast check (compiles without building full bundles)
npx ng build --watch=false --configuration development
```

### 3. E2E Verification

**Rule:** If the playlist is touched, verify it loads.

**Manual Check:**

1. Run `pnpm tauri dev`
2. Wait for app load
3. Upload/Select a playlist
4. **VERIFY:** List items appear. (If loading spinner persists forever, check console for module errors).

## Debugging Workflow Integration

This guide is now part of the repository's `/debug` workflow. When debugging "missing playlist" or "build errors":

1. **Run `npx ng build` immediately.** Do not guess.
2. **Check `app.module.ts`** against the `imports` array.
3. **Verify Component Properties** match the Template.
