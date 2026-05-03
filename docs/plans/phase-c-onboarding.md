# Plan — Phase C (GitHub clone workflow + onboarding polish)

## Context

Phase B shipped W1–W12 column labels, the moving NOW line, editable SCHEDULE/NOTES
in the milestone detail panel, and macOS `.app` packaging via `electron-builder`.
The user has now identified three UX/workflow issues in the onboarding flow:

1. **GitHub clone destination unclear** — when cloning a repo, the folder picker
   asks the user where to put it, but new users don't know if they should use
   `~/Desktop`, `~/Documents`, or create a new folder. The flow is confusing.

2. **EEXIST error when selecting `.app` bundle** — the folder picker on macOS
   lets users accidentally select the app bundle itself (since `.app` looks like
   a folder in Finder), causing an unmountable error.

3. **manifesto.md status and creation unclear** — the onboarding only shows
   "Import roadmap.md" and "Create roadmap.md" buttons. If a user has a GitHub
   repo with `docs/manifesto.md` already, there's no visual feedback. If they
   need to create one, the button doesn't exist.

4. **Activate Command Center button is confusing** — the button stays disabled
   even when roadmap.md exists (because it only activates in a narrow edge case),
   and many users expect it to do something. It should be removed.

5. **"How it works" diagram needs updating** — the flow diagram at the bottom
   of onboarding doesn't reflect the GitHub + manifesto changes, and it's still
   referencing the old "Activate" button workflow.

**User decisions:**
- Use persistent Settings field for GitHub clone destination (ask once, reuse).
- Validate folder picker: reject any path containing `.app/` with a clear error.
- Show ✓/✗ badges for roadmap.md and manifesto.md (green ✓ if file exists,
  red ✗ if missing).
- Add separate "Import manifesto.md" and "Create manifesto.md" buttons alongside
  the roadmap buttons.
- Delete the "Activate Command Center" button entirely (automatic activation via
  the import/create buttons is sufficient).
- Rewrite "How it works" to show the full GitHub + manifesto flow without
  removing core concepts; just update the diagrams and wording to match the
  new behavior.
- Change button colors for Import/Create manifesto.md to purple (accent) to
  match other primary action buttons.

## Plan

### 1. `src/main/settings.ts` — add GitHub clone destination field

Current: stores only `operatorName`.
Extend to also store `githubCloneParentFolder` (absolute path string, nullable).

```typescript
interface AppSettings {
  operatorName?: string | null
  githubCloneParentFolder?: string | null  // NEW
}
```

Exported functions:
- `readSettings()` → returns `AppSettings`
- `writeSettings(next: AppSettings)` → void
- Helper: `getGitHubCloneParentFolder()` → returns path or defaults to
  `expandUser('~/Documents/JYRY-Projects')`

### 2. `src/main/index.ts` — new IPC handlers + validation

**New handlers:**

- `settings:getGithubCloneParentFolder` → returns the stored path or default.
- `settings:setGithubCloneParentFolder(path: string)` → validates path is
  absolute + writable + NOT an `.app/` bundle, then saves. Returns `{ ok, error? }`.
- Update `workspace:chooseProjectFolder` to validate: if path contains `.app/`,
  reject with error "Cannot use an application bundle as a project folder."
- Update `workspace:cloneFromGitHub` logic:
  - If no parent folder set in Settings, ask user once (via folder dialog).
  - Save the chosen folder to Settings.
  - Clone repo into `parentFolder/repoName`.
  - Same `.app/` validation as above.

### 3. `src/preload/index.ts` — expose new settings methods

```typescript
window.api.settings = {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (next) => ipcRenderer.invoke('settings:set', next),
  getGithubCloneParentFolder: () => ipcRenderer.invoke('settings:getGithubCloneParentFolder'),
  setGithubCloneParentFolder: (path) => ipcRenderer.invoke('settings:setGithubCloneParentFolder', path),
}
```

### 4. `src/renderer/env.d.ts` — update type declarations

Add the two new settings methods to `SettingsAPI` interface.

### 5. `src/renderer/components/SettingsModal.tsx` — add GitHub clone folder setting

New section (after operator name, before GitHub disconnect):

```
GITHUB CLONE DESTINATION
Parent folder where GitHub repos are cloned (set once)
[ /Users/jyry/Documents/JYRY-Projects ]  [Change]

[Save if dirty] / [Cancel]
```

- Read `githubCloneParentFolder` on modal open.
- Show the path + a "Change" button that opens folder picker.
- On save, call `window.api.settings.setGithubCloneParentFolder(newPath)`.
- On error (e.g., path invalid or is `.app/`), show inline error message.

### 6. `src/renderer/components/GitHubBrowserModal.tsx` — remove folder picker, use Setting

Current flow: user selects repo → folder picker opens → clone.
New flow: user selects repo → immediate clone to settings folder (or prompt for
Settings setup if not configured).

- Before opening the browser, check if `githubCloneParentFolder` is set.
- If not set, show a prompt: "First time setup: choose a folder for cloned
  repos" → folder picker → save to Settings → proceed.
- If set, skip the picker and clone directly.
- On clone completion, show path confirmation before closing modal.

### 7. `src/renderer/views/OnboardingView.tsx` — status badges + new buttons + delete Activate

**Compute roadmap & manifesto status:**

```typescript
const projectRoot = workspaceStatus?.projectRoot
const hasRoadmap = Boolean(workspaceStatus?.roadmapExists)
const hasManifesto = Boolean(workspaceStatus?.manifestoExists)  // NEW
```

**Card 3 layout (unchanged shape, updated buttons):**

```
3. Add roadmap.md & manifesto.md
Use existing files or let the app scaffold a starter set.

[ ✓ roadmap.md ]  [ ✗ manifesto.md ]    ← status badges, read-only

[ Import roadmap.md ] [ Create roadmap.md ]
[ Import manifesto.md ] [ Create manifesto.md ]   ← NEW buttons, purple

Remove the old "Activate Command Center" button entirely.
```

**Status badges:**
- ✓ in green (#22C55E) if file exists.
- ✗ in red (#EF4444) if missing.
- Small text below each: "roadmap.md" / "manifesto.md".
- Click → read-only, just for information.

**Button styling:**
- "Create roadmap.md" / "Create manifesto.md" → purple (accent) background,
  white text (same as "Choose Folder" and "Connect to GitHub").
- "Import roadmap.md" / "Import manifesto.md" → same purple styling.
- Disabled when `!projectRoot`.

**New IPC handlers (main/index.ts):**

- `workspace:importManifesto()` → file dialog for `manifesto.md` → copy to
  `projectRoot/docs/manifesto.md` → return status.
- `workspace:createStarterManifesto()` → write starter `manifesto.md` to
  `projectRoot/docs/manifesto.md` → return status.

Both should call `getWorkspaceStatus()` after writing to refresh the status
badges.

### 8. `src/renderer/views/OnboardingView.tsx` — update "How it works" diagram

**Current diagram** references the old "Activate" button and phases.
**New diagram** should show:

```
pick a project source                  ┌──────────────────────────────┐
─────────────────────                  │ docs/roadmap.md exists?      │
                                       └──────────────────────────────┘
1. local project folder ───┐                       │
                           │                       │── yes ─► tracker auto-generates
2. github repo (PAT)      ─┤    project folder  ───┤           ─► open dashboard
   (clones to your saved   │  (set once in           │
    parent folder,         │   Settings)             │── no  ─► import OR create roadmap.md
    set in Settings)       │                       │           (+ manifesto.md buttons)
                           │                       │              │
3. scaffold from card 3 ──┘   (if no roadmap       │              ▼
   (only after you've          yet, add one         │        tracker auto-generates
    picked a folder)           here)                │              │
                                                   ▼              ▼
                                              open dashboard  ◄───┘

manifesto.md:
  ✓ green check if found in docs/manifesto.md
  ✗ red X if missing — use Import or Create button

note: roadmap.md MUST be Markdown. manifesto.md is optional but recommended
(feeds product context to agents during build/audit cycles).
after any create/import, tracker auto-generates and dashboard opens immediately.
```

Key changes:
- Mention "set once in Settings" for GitHub.
- Explicitly say "if no roadmap yet, add one here" (clarifies the workflow).
- Show manifesto badges.
- Remove reference to "Activate Command Center" button.
- Clarify that auto-generation happens on import/create, not a separate step.

### 9. `src/main/parser.ts` — detect manifesto.md at read time

Current: `configureWorkspace()` writes the tracker JSON but doesn't record
whether `manifesto.md` exists.

Change: add `manifestoExists: boolean` field to `WorkspaceStatus` struct, set
it during `getWorkspaceStatus()` by checking for `docs/manifesto.md`.

Update the interface in `src/main/workspace.ts`:

```typescript
interface WorkspaceStatus {
  projectRoot: string | null
  roadmapExists: boolean
  manifestoExists: boolean  // NEW
  trackerExists: boolean
}
```

## Critical files to modify

1. `src/main/settings.ts` — add `githubCloneParentFolder` field + helpers
2. `src/main/index.ts` — new IPC handlers + validation for `.app/` paths
3. `src/main/workspace.ts` — extend `WorkspaceStatus` + add `importManifesto` /
   `createStarterManifesto` handlers
4. `src/preload/index.ts` — expose new settings methods
5. `src/renderer/env.d.ts` — type new settings methods + `manifestoExists`
6. `src/renderer/components/SettingsModal.tsx` — add GitHub folder picker
7. `src/renderer/components/GitHubBrowserModal.tsx` — remove folder picker,
   use Settings value
8. `src/renderer/views/OnboardingView.tsx` — status badges, new buttons, delete
   Activate button, update diagram

## Reuse, not re-invent

- `useStore` + `updateTracker` for local state — already proven in Phase A.
- Existing folder picker pattern from `chooseProjectFolder` — reuse for
  Settings setup.
- `loadTrackerFromWorkspace()` — already re-reads from disk, will catch the
  new `manifestoExists` flag.
- Starter roadmap template in `parser.ts` — extend with a companion starter
  manifesto template.
- IPC call pattern — match existing `workspace:*` and `settings:*` namespaces.

## Verification

**V.1 — GitHub clone destination setting**

1. Open Settings modal (first time).
2. Section "GITHUB CLONE DESTINATION" shows default `~/Documents/JYRY-Projects`.
3. Click "Change" → folder picker opens.
4. Select a new folder (e.g., `~/Desktop`).
5. Click "Save" → confirmation message.
6. Close modal, re-open → shows the new path.
7. Go back to onboarding, click "Connect to GitHub" → clone without folder picker,
   goes straight to destination folder.

**V.2 — `.app/` validation**

1. Onboarding, Card 1, "Choose Folder".
2. In folder picker, try to select `JYRY Command Center.app` from Desktop.
3. Error message: "Cannot use an application bundle as a project folder."
4. Picker stays open, user can select a proper folder.

**V.3 — manifesto.md status badges + buttons**

1. Create a new local project folder (Card 1).
2. Card 3 shows: "✓ roadmap.md", "✗ manifesto.md" (no files exist yet).
3. Click "Create roadmap.md" → tracker generates → dashboard.
4. Return home, back to onboarding → now shows "✓ roadmap.md", "✗ manifesto.md".
5. Click "Create manifesto.md" → file written to `docs/manifesto.md`.
6. Return home, re-open onboarding → now shows "✓ roadmap.md", "✓ manifesto.md".

**V.4 — Activate button removed**

1. Card 3 now shows only Import/Create buttons for roadmap + manifesto.
2. No "Activate Command Center" button.
3. Auto-activation still works: click "Create roadmap.md" → immediate dashboard open.

**V.5 — "How it works" updated**

1. Diagram shows GitHub → Settings folder, manifesto badges, and auto-generation flow.
2. No reference to old "Activate" button.
3. Copy is clear about optional manifesto.md role.

## Out of scope

- OAuth flow (PAT only, per user decision).
- Windows/Linux folder defaults (Mac-focused, can extend later).
- Automatic re-clone if Settings folder changes (user responsible for moving files).
- Manifesto content customization (starter template fixed; users edit in editor).
