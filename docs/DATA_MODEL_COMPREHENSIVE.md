# User Story Mapping Tool - Comprehensive Data Model Documentation

**Version:** 2.0 (Corrected)  
**Date:** 2025-11-18  
**Purpose:** Backend API and Database Schema Design  
**Auth:** Supabase JWT-based authentication

---

## Table of Contents
1. [Data Entities Overview](#1-data-entities-overview)
2. [Entity Schemas](#2-entity-schemas)
3. [Relationships](#3-relationships)
4. [CRUD Operations](#4-crud-operations)
5. [Derived/Computed Data](#5-derivedcomputed-data)
6. [State Flow & User Workflows](#6-state-flow--user-workflows)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Database Design Recommendations](#8-database-design-recommendations)
9. [API Endpoint Recommendations](#9-api-endpoint-recommendations)

---

## 1. Data Entities Overview

The application has **6 core entities** and **4 supporting entities**:

### Core Entities (Persisted)
1. **Journey** - Top-level user workflow grouping (e.g., "Messaging", "Settings")
2. **Step** - Activity within a journey (e.g., "Send messages", "Receive messages")
3. **Story** - User story/task (positioned at Step × Release intersection)
4. **Release** - Time-based release/sprint (e.g., "MVP", "Release 2")
5. **Tag** - Reusable label for categorizing stories
6. **Persona** - User persona/role (e.g., "Admin", "End User")

### Supporting Entities (Embedded/Related)
7. **Label** - Visual label on a story (embedded in Story, not standalone)
8. **StoryLink** - Dependency between two stories (embedded in Story.dependencies)
9. **Comment** - Comment on a story or release (embedded in Story/Release)
10. **Attachment** - File attachment on a story (embedded in Story)

---

## 2. Entity Schemas

### 2.1 Journey

**Purpose:** Top-level user journey that groups related steps

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `name` | string | ✅ | - | Journey name (e.g., "1. Messaging") |
| `description` | string | ❌ | "" | Optional description |
| `sort_order` | number | ✅ | auto-increment | Position in left-to-right order |
| `color` | string | ❌ | "#8B5CF6" | Hex color code for visual grouping |
| `created_at` | Date | ✅ | now() | Timestamp of creation |
| `updated_at` | Date | ✅ | now() | Timestamp of last update |

**Constraints:**
- `name` must be unique
- `sort_order` determines horizontal position (left to right)
- Deleting a journey cascades to steps and stories

---

### 2.2 Step

**Purpose:** Activity or phase within a journey (vertical columns in UI)

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `journey_id` | string | ✅ | - | Foreign key to Journey |
| `name` | string | ✅ | - | Step name (e.g., "Send messages") |
| `description` | string | ❌ | "" | Optional description |
| `sort_order` | number | ✅ | auto-increment | Position within journey (left to right) |
| `created_at` | Date | ✅ | now() | Timestamp of creation |
| `updated_at` | Date | ✅ | now() | Timestamp of last update |

**Constraints:**
- `journey_id` must reference valid Journey
- `sort_order` is relative within a journey
- Deleting a step cascades to stories in that step

---

### 2.3 Story

**Purpose:** User story/task positioned at a Step × Release cell

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `step_id` | string | ✅ | - | Foreign key to Step (defines column) |
| `release_id` | string | ✅ | - | Foreign key to Release (defines row) |
| `title` | string | ✅ | - | Story title (displayed on card) |
| `description` | string | ✅ | "" | Rich text description (markdown?) |
| `label` | Label | ✅ | default | Visual label (embedded object) |
| `tags` | Tag[] | ✅ | [] | Array of tag objects |
| `personas` | Persona[] | ✅ | [] | Array of persona objects |
| `attachments` | Attachment[] | ✅ | [] | Array of file attachments |
| `size` | number | ❌ | null | Story points (1, 2, 3, 5, 8, etc.) |
| `status` | StoryStatus | ✅ | NOT_READY | Current status (enum) |
| `dependencies` | StoryLink[] | ✅ | [] | Array of dependencies (embedded) |
| `comments` | Comment[] | ✅ | [] | Array of comments |
| `sort_order` | number | ✅ | auto-increment | Position within cell (top to bottom) |
| `created_at` | Date | ✅ | now() | Timestamp of creation |
| `updated_at` | Date | ✅ | now() | Timestamp of last update |

**Enum: StoryStatus**
- `NOT_READY` - Story not ready for work
- `READY` - Ready to be picked up
- `IN_PROGRESS` - Currently being worked on
- `DONE` - Completed
- `BLOCKED` - Blocked by dependencies or issues

**Constraints:**
- `step_id` must reference valid Step
- `release_id` must reference valid Release
- Stories are positioned in a 2D grid: (step_id, release_id) = cell coordinate
- `sort_order` determines vertical order within a cell

**Sort Order Implementation:**
- Stories use **1000-based spacing**: `1000, 2000, 3000, ...`
- This allows inserting stories between existing ones without reordering all
- Example: Insert between stories at 1000 and 2000 → use 1500
- Other entities (Journey, Step, Release) use simple 0-based increment: `0, 1, 2, ...`

---

### 2.4 Release

**Purpose:** Time-based release/sprint containing stories

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `name` | string | ✅ | - | Release name (e.g., "MVP (MVP)") |
| `description` | string | ❌ | "" | Optional description |
| `start_date` | Date | ❌ | null | Release start date |
| `due_date` | Date | ❌ | null | Release due date |
| `shipped` | boolean | ✅ | false | Whether release is shipped |
| `tags` | string[] | ❌ | [] | Array of tag strings (optional) |
| `comments` | Comment[] | ❌ | [] | Comments on the release |
| `is_unassigned` | boolean | ✅ | false | Special flag for "Unassigned" release |
| `sort_order` | number | ✅ | auto-increment | Position in top-to-bottom order |
| `created_at` | Date | ✅ | now() | Timestamp of creation |
| `updated_at` | Date | ✅ | now() | Timestamp of last update |

**Special Rules:**
- One release must have `is_unassigned: true` (cannot be deleted)
- Unassigned release always appears at the bottom (highest sort_order)
- Deleting a release moves its stories to Unassigned
- `sort_order` determines vertical position (top to bottom)

---

### 2.5 Tag

**Purpose:** Reusable categorization label for stories

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `name` | string | ✅ | - | Tag name (e.g., "Frontend", "Bug") |
| `color` | string | ✅ | "#8B5CF6" | Hex color code for visual display |
| `created_at` | Date | ✅ | now() | Timestamp of creation |

**Constraints:**
- `name` should be unique
- Tags are attached to stories via many-to-many relationship

---

### 2.6 Persona

**Purpose:** User persona/role for story context

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `name` | string | ✅ | - | Persona name (e.g., "Admin User") |
| `description` | string | ❌ | "" | Optional description |
| `avatar_url` | string | ❌ | null | Optional avatar image URL |
| `created_at` | Date | ✅ | now() | Timestamp of creation |

**Constraints:**
- Personas are attached to stories via many-to-many relationship

---

### 2.7 Label (Embedded in Story)

**Purpose:** Visual label/badge on a story card

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | - | Label identifier |
| `name` | string | ✅ | - | Label text (e.g., "Feature", "Bug") |
| `color` | string | ✅ | "#3B82F6" | Hex color code for background |

**Storage:** Embedded directly in Story object (not a separate table)

---

### 2.8 StoryLink (Embedded in Story)

**Purpose:** Dependency/relationship between two stories

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `source_story_id` | string | ✅ | - | Story that has the dependency |
| `target_story_id` | string | ✅ | - | Story being depended upon |
| `link_type` | string | ✅ | "linked to" | Type of relationship |
| `created_at` | Date | ✅ | now() | Timestamp of creation |

**Link Types (Runtime Values - Note: Different from TypeScript enum!):**
- `"linked to"` - General dependency (shows curved line in UI)
- `"blocks"` - Source blocks target
- `"is blocked by"` - Source is blocked by target
- `"duplicates"` - Source duplicates target
- `"is duplicated by"` - Source is duplicated by target

**Storage:** Embedded in Story.dependencies array (could be separate table)

**Important:** The TypeScript enum `StoryLinkType` defines `DEPENDENCY`, `BLOCKER`, etc., but the actual runtime code uses string literals like `"linked to"`. This is existing tech debt.

---

### 2.9 Comment (Embedded in Story/Release)

**Purpose:** Comment on a story or release (collaborative commenting system)

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `story_id` | string | ❌ | null | Foreign key to Story (if commenting on story) |
| `author_id` | string | ✅ | from JWT | User ID of commenter (extracted from auth token) |
| `author` | string | ✅ | from JWT | Display name of commenter (from user profile) |
| `avatar_url` | string | ❌ | from JWT | Avatar URL of commenter (from user profile) |
| `content` | string | ✅ | - | Comment text content |
| `created_at` | Date | ✅ | now() | Timestamp of creation |
| `updated_at` | Date | ✅ | now() | Timestamp of last edit |

**Auth Pattern:**
- Frontend sends only `content` in request body
- Backend extracts `author_id`, `author`, `avatar_url` from JWT token
- Backend returns full comment object with `is_current_user: boolean` flag
- Frontend shows edit/delete buttons only if `is_current_user === true`

**Storage:** Embedded in Story.comments or Release.comments array

---

### 2.10 Attachment (Embedded in Story)

**Purpose:** File attachment on a story

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ | auto-generated | Unique identifier |
| `story_id` | string | ✅ | - | Foreign key to Story |
| `file_name` | string | ✅ | - | Original filename |
| `file_url` | string | ✅ | - | URL to file (CDN or storage) |
| `file_type` | string | ✅ | - | MIME type (e.g., "image/png") |
| `file_size` | number | ✅ | - | File size in bytes |
| `uploaded_by` | string | ❌ | null | User ID who uploaded |
| `created_at` | Date | ✅ | now() | Timestamp of upload |

**Storage:** Embedded in Story.attachments array

---

## 3. Relationships

### 3.1 Entity Relationship Diagram (ERD)

```
Journey (1) ──< (Many) Step
   ↓                      ↓
   id                     journey_id

Step (1) ──< (Many) Story
   ↓                   ↓
   id                  step_id

Release (1) ──< (Many) Story
   ↓                      ↓
   id                     release_id

Story (1) ──< (Many) Comment
Story (1) ──< (Many) Attachment
Story (1) ──< (Many) StoryLink
Story (Many) ──< (Many) Tag
Story (Many) ──< (Many) Persona

StoryLink (Many to 1) ──> Story (target_story_id)
StoryLink (Many to 1) ──> Story (source_story_id)
```

### 3.2 Relationship Details

#### Journey → Steps (One-to-Many)
- **Type:** Parent-child
- **Cascade:** Deleting journey deletes all child steps
- **Ordering:** Steps ordered by `sort_order` within journey
- **Query Pattern:** `SELECT * FROM steps WHERE journey_id = ? ORDER BY sort_order`

#### Step → Stories (One-to-Many)
- **Type:** Parent-child
- **Cascade:** Deleting step deletes all child stories
- **Query Pattern:** `SELECT * FROM stories WHERE step_id = ?`

#### Release → Stories (One-to-Many)
- **Type:** Parent-child with special rule
- **Cascade:** Deleting release moves stories to Unassigned release (soft cascade)
- **Special:** One release must have `is_unassigned: true`
- **Query Pattern:** `SELECT * FROM stories WHERE release_id = ?`

#### Story → StoryLinks (One-to-Many, Self-Referential)
- **Type:** Self-referential many-to-many (via StoryLink join)
- **Direction:** Source story → Target story (directional dependency)
- **Bidirectional:** UI shows both "depends on" and "blocks" perspectives
- **Storage Options:**
  - Option A: Embedded in Story.dependencies array (current)
  - Option B: Separate `story_links` table with (source_id, target_id, type)
- **Cascade:** Deleting story removes all StoryLinks referencing it

#### Story ↔ Tags (Many-to-Many)
- **Type:** Many-to-many
- **Storage Options:**
  - Option A: Embedded array in Story (current: `Story.tags`)
  - Option B: Junction table `story_tags (story_id, tag_id)`
- **Cascade:** Deleting tag removes it from all stories

#### Story ↔ Personas (Many-to-Many)
- **Type:** Many-to-many
- **Storage Options:**
  - Option A: Embedded array in Story (current: `Story.personas`)
  - Option B: Junction table `story_personas (story_id, persona_id)`
- **Cascade:** Deleting persona removes it from all stories

#### Story → Comments (One-to-Many)
- **Type:** Parent-child
- **Storage:** Embedded in Story.comments array
- **Cascade:** Deleting story deletes all comments

#### Story → Attachments (One-to-Many)
- **Type:** Parent-child
- **Storage:** Embedded in Story.attachments array
- **Cascade:** Deleting story deletes all attachments (and files)

---

## 4. CRUD Operations

### 4.1 Journey Operations

#### Create Journey
**Frontend Sends:**
```typescript
{
  name: string,          // Required
  color?: string,        // Optional, default: "#8B5CF6"
  description?: string   // Optional
}
```
**Backend Returns:**
```typescript
Journey (complete object with id, sort_order, timestamps)
```
**Side Effects:**
- Auto-generates `id`
- Sets `sort_order` to highest + 1
- Sets `created_at` and `updated_at`
- Triggers grid recalculation (frontend)

#### Read Journeys
**Patterns:**
1. **Get All:** `GET /journeys` → Returns all journeys sorted by sort_order
2. **Get One:** `GET /journeys/:id` → Returns single journey

#### Update Journey
**Frontend Sends:**
```typescript
{
  name?: string,
  color?: string,
  description?: string,
  sort_order?: number  // For reordering
}
```
**Type:** Partial update (PATCH semantics)
**Side Effects:**
- Updates `updated_at`
- Triggers grid recalculation (frontend)

#### Delete Journey
**Type:** Hard delete (cascades to steps and stories)
**Side Effects:**
- Deletes all child steps
- Deletes all stories in those steps
- Removes all dependencies to deleted stories
- Triggers grid recalculation

---

### 4.2 Step Operations

#### Create Step
**Frontend Sends:**
```typescript
{
  journey_id: string,  // Required
  name: string,        // Required
  description?: string // Optional
}
```
**Backend Returns:**
```typescript
Step (complete object)
```
**Side Effects:**
- Auto-generates `id`
- Sets `sort_order` relative to journey (highest in journey + 1)
- Triggers grid recalculation

#### Read Steps
**Patterns:**
1. **Get All:** `GET /steps` → All steps
2. **By Journey:** `GET /journeys/:journeyId/steps` → Steps for one journey
3. **Get One:** `GET /steps/:id` → Single step

#### Update Step
**Frontend Sends:**
```typescript
{
  name?: string,
  description?: string,
  sort_order?: number  // For reordering within journey
}
```
**Type:** Partial update

#### Delete Step
**Type:** Hard delete (cascades to stories)
**Side Effects:**
- Deletes all stories in this step
- Removes dependencies to deleted stories

---

### 4.3 Story Operations

#### Create Story
**Frontend Sends:**
```typescript
{
  step_id: string,          // Required (defines column)
  release_id: string,       // Required (defines row)
  title: string,            // Required
  description?: string,     // Optional
  status?: StoryStatus,     // Optional, default: NOT_READY
  size?: number             // Optional (story points)
}
```
**Backend Returns:**
```typescript
Story (complete object with defaults)
```
**Defaults:**
- `label`: { id: 'default', name: 'Story', color: '#3B82F6' }
- `tags`: []
- `personas`: []
- `attachments`: []
- `dependencies`: []
- `comments`: []
- `status`: NOT_READY
- `sort_order`: auto (highest in cell + 1)

#### Read Stories
**Patterns:**
1. **Get All:** `GET /stories` → All stories
2. **By Step:** `GET /steps/:stepId/stories` → All stories in step
3. **By Release:** `GET /releases/:releaseId/stories` → All stories in release
4. **By Cell:** `GET /stories?step_id=X&release_id=Y` → Stories at intersection
5. **Get One:** `GET /stories/:id` → Single story with all nested data

#### Update Story
**Frontend Sends (Partial):**
```typescript
{
  title?: string,
  description?: string,
  label?: Label,
  status?: StoryStatus,
  size?: number,
  tags?: Tag[],           // Full array replacement
  personas?: Persona[],   // Full array replacement
  attachments?: Attachment[],
  dependencies?: StoryLink[],
  comments?: Comment[],
  step_id?: string,       // For moving to different cell
  release_id?: string,    // For moving to different cell
  sort_order?: number     // For reordering
}
```
**Type:** Partial update (PATCH semantics)
**Special Cases:**
- **Move operations** change `step_id` and/or `release_id`
- **Reorder operations** change `sort_order`
- Arrays are replaced entirely (not merged)

#### Delete Story
**Type:** Hard delete
**Side Effects:**
- ⚠️ **CRITICAL:** Must remove story from ALL dependencies (both source and target)
- If using separate `story_links` table: `DELETE FROM story_links WHERE source_story_id = ? OR target_story_id = ?`
- If using embedded dependencies: Remove from all stories' dependencies arrays
- Deletes all comments (cascade)
- Deletes all attachments and their files (cascade)
- Closes story detail panel if open (frontend only)
**Backend Returns:**
```typescript
{
  success: true,
  dependencies_removed: number  // Count of dependency links removed
}
```

---

### 4.4 Release Operations

#### Create Release
**Frontend Sends:**
```typescript
{
  name: string,          // Required (e.g., "Sprint 5")
  description?: string,
  start_date?: Date,
  due_date?: Date
}
```
**Backend Returns:**
```typescript
Release (complete object)
```
**Side Effects:**
- Auto-generates `id`
- Sets `sort_order` to highest + 1 (but below Unassigned)
- Sets `shipped: false`
- Sets `is_unassigned: false`

#### Read Releases
**Patterns:**
1. **Get All:** `GET /releases` → All releases (regular + Unassigned)
   - Sorted by `sort_order`
   - Unassigned always at bottom
2. **Get One:** `GET /releases/:id`

#### Update Release
**Frontend Sends:**
```typescript
{
  name?: string,
  description?: string,
  start_date?: Date,
  due_date?: Date,
  shipped?: boolean,
  sort_order?: number  // For reordering
}
```
**Type:** Partial update
**Constraints:**
- Cannot update `is_unassigned` field
- Cannot delete Unassigned release

#### Delete Release
**Type:** Soft cascade (moves stories to Unassigned)
**Constraints:**
- Cannot delete release with `is_unassigned: true`
**Side Effects:**
- ⚠️ **CRITICAL:** All stories MUST be moved to Unassigned release before deletion
- SQL: `UPDATE stories SET release_id = (unassigned_id) WHERE release_id = ?`
- Then delete release: `DELETE FROM releases WHERE id = ?`
- Release comments are deleted with the release
**Backend Returns:**
```typescript
{
  success: true,
  stories_moved: number  // Count of stories moved to Unassigned
}
```

---

### 4.5 Tag Operations

#### Create Tag
**Frontend Sends:**
```typescript
{
  name: string,    // Required
  color: string    // Required (hex code)
}
```

#### Read Tags
**Pattern:** `GET /tags` → All tags

#### Delete Tag
**Type:** Soft delete (removes from stories)
**Side Effects:**
- Removed from all stories' tags array

---

### 4.6 Persona Operations

#### Create Persona
**Frontend Sends:**
```typescript
{
  name: string,
  description?: string,
  avatar_url?: string
}
```

#### Read Personas
**Pattern:** `GET /personas` → All personas

#### Delete Persona
**Type:** Soft delete (removes from stories)
**Side Effects:**
- Removed from all stories' personas array

---

### 4.7 Dependency Operations

#### Add Dependency
**Frontend Sends:**
```typescript
{
  source_story_id: string,  // Story that depends on target
  target_story_id: string,  // Story being depended upon
  link_type: string         // Default: "linked to"
}
```
**Storage:** Adds to Story.dependencies array
**Validation:**
- Both stories must exist
- Cannot create duplicate dependency
- Cannot create circular dependency (optional validation)

#### Remove Dependency
**Frontend Sends:** `DELETE /stories/:sourceId/dependencies/:targetId`
**Storage:** Removes from Story.dependencies array

#### Get Dependencies
**Pattern:** `GET /stories/:id/dependencies` → All dependencies for story

---

### 4.8 Comment Operations

#### Add Comment
**Frontend Sends:**
```typescript
{
  content: string  // ONLY content - auth info extracted from JWT
}
```
**Backend Processes:**
1. Verifies JWT token from `Authorization: Bearer <token>` header
2. Extracts `user_id`, `name`, `avatar_url` from JWT claims
3. Creates comment with auto-populated author fields
**Backend Returns:**
```typescript
{
  id: string,
  story_id: string,
  author_id: string,        // From JWT
  author: string,           // From JWT
  avatar_url: string | null,// From JWT
  content: string,
  created_at: Date,
  updated_at: Date,
  is_current_user: true     // Always true for newly created comment
}
```

#### Update Comment
**Frontend Sends:**
```typescript
{
  content: string  // ONLY content - no author fields
}
```
**Backend Processes:**
1. Verifies JWT token
2. Validates: `comment.author_id === jwt.sub` (must be author)
3. Updates only `content` and `updated_at`
4. Returns 403 if not the comment author

**Backend Returns:**
```typescript
{
  ...comment,
  updated_at: Date,      // Updated timestamp
  is_current_user: true  // Always true (user can only edit own comments)
}
```

#### Delete Comment
**Pattern:** `DELETE /comments/:commentId`
**Backend Processes:**
1. Verifies JWT token
2. Validates: `comment.author_id === jwt.sub` (must be author)
3. Deletes comment
4. Returns 403 if not the comment author

**Backend Returns:**
```typescript
{
  success: true
}
```

---

## 5. Derived/Computed Data

### 5.1 Grid Calculations (Frontend)

**Purpose:** Calculate 2D layout for story map UI

**Inputs:**
- All Journeys (sorted by sort_order)
- All Steps (sorted by sort_order within journey)
- All Releases (sorted by sort_order)

**Outputs:**
```typescript
{
  totalColumns: number,        // Total number of step columns
  totalRows: number,           // Total number of releases
  journeyColumns: Map<journeyId, { startColumn, columnSpan }>,
  stepColumns: Map<stepId, columnNumber>,
  releaseRows: Map<releaseId, rowNumber>
}
```

**When Recalculated:**
- Journey created/updated/deleted/reordered
- Step created/updated/deleted/reordered
- Release created/updated/deleted/reordered

**Backend Consideration:** This is UI-specific and should stay on frontend. Backend only needs to provide sorted entity lists.

---

### 5.2 Release Statistics

**Purpose:** Calculate metrics for release headers

**Inputs:**
- One Release
- All Stories in that release

**Outputs:**
```typescript
{
  totalStories: number,       // Count of all stories
  pointsRemaining: number,    // Sum of size for non-DONE stories
  unsizedCount: number        // Count of stories with no size
}
```

**Display Format:** `"12 STORIES • 45 PTS • (3 UNSIZED)"`

**Backend Consideration:** Could be computed on backend for performance, or left to frontend.

---

### 5.3 Release Progress

**Purpose:** Calculate completion percentage and date metrics

**Inputs:**
- One Release (with dates)
- All Stories in that release

**Outputs:**
```typescript
{
  releaseId: string,
  completedStories: number,     // Count with status = DONE
  totalStories: number,
  progressPercent: number,      // (completed / total) * 100
  releaseLengthDays: number,    // due_date - start_date
  isDueInDays: number,          // due_date - today
  isOverdue: boolean            // isDueInDays < 0
}
```

**Usage:**
- Progress bars
- Risk indicators
- Dashboard metrics

**Backend Consideration:** Should be computed on backend and cached for dashboard/reporting.

---

### 5.4 Story Count by Status (Per Release)

**Purpose:** Breakdown of stories by status

**Inputs:**
- Release ID
- All Stories

**Outputs:**
```typescript
{
  NOT_READY: number,
  READY: number,
  IN_PROGRESS: number,
  DONE: number,
  BLOCKED: number
}
```

**Backend Consideration:** Useful for analytics, should be backend endpoint.

---

### 5.5 Risk Calculation

**Purpose:** Identify at-risk releases

**Logic:**
```typescript
isAtRisk = (
  !release.shipped &&
  isDueInDays <= 7 &&
  isDueInDays > 0 &&
  progressPercent < 50
)
```

**Backend Consideration:** Backend should provide flag or filter for at-risk releases.

---

## 6. State Flow & User Workflows

### 6.1 Initial Setup Flow

```
1. User creates Journey ("Messaging")
   → Backend: POST /journeys
   → Frontend: Triggers grid recalculation

2. User adds Steps to Journey ("Send messages", "Receive messages")
   → Backend: POST /steps (multiple times)
   → Frontend: Triggers grid recalculation

3. User creates Releases ("MVP", "Release 2")
   → Backend: POST /releases
   → Frontend: Triggers grid recalculation
   → System ensures "Unassigned" release exists

4. Grid is now ready for stories
```

---

### 6.2 Story Creation Flow

```
1. User clicks "+" button in a grid cell (Step × Release)
   → Opens CreateStoryDialog
   → Pre-fills step_id and release_id

2. User enters title and description
   → Frontend validation: title required

3. User clicks "Create"
   → Backend: POST /stories
   → Frontend: Updates local state
   → Frontend: Story card appears in grid

4. (Optional) User clicks story to edit details
   → Opens EditStorySheet
   → User can add tags, personas, dependencies, comments
   → Backend: PATCH /stories/:id (multiple times)
```

---

### 6.3 Story Movement Flow (Drag & Drop)

```
1. User drags story card
   → DnD system captures source cell (step_id, release_id)

2. User drops story on new cell
   → DnD system captures target cell

3. Frontend calculates:
   - Is it a horizontal move? (different step, same release)
   - Is it a vertical move? (same step, different release)
   - Is it a diagonal move? (different step AND release)
   - Is it a reorder? (same cell, different position)

4. Frontend sends update:
   → Backend: PATCH /stories/:id
   → Payload: { step_id, release_id, sort_order }

5. Frontend updates UI
   → Optimistic update (no flicker)
   → Triggers dependency line recalculation
```

**Drag Patterns:**
- **Horizontal:** Move between steps (e.g., "Send messages" → "Receive messages")
- **Vertical:** Move between releases (e.g., "MVP" → "Release 2")
- **Diagonal:** Move between both dimensions
- **Reorder:** Change position within same cell

---

### 6.4 Dependency Creation Flow

```
1. User opens story detail sheet
   → Clicks "Add Dependency"

2. User selects link type ("linked to", "blocks", etc.)

3. User searches for target story
   → Dropdown shows all stories (except current)

4. User selects target story

5. Frontend sends:
   → Backend: POST /stories/:sourceId/dependencies
   → Payload: { target_story_id, link_type }

6. Frontend updates UI:
   → Adds dependency to story object
   → Triggers dependency line rendering
   → Purple S-curve appears connecting stories
```

---

### 6.5 Release Management Flow

```
1. User clicks release header
   → Opens EditReleaseSheet

2. User can edit:
   - Name
   - Start date
   - Due date
   - Description
   - Mark as shipped

3. User clicks "Save"
   → Backend: PATCH /releases/:id
   → Frontend: Updates release header

4. (Optional) User deletes release
   → Confirmation dialog
   → Backend: DELETE /releases/:id
   → Backend: Moves all stories to Unassigned
   → Frontend: Removes release row from grid
```

---

### 6.6 Comment Flow

```
1. User opens story detail sheet
   → Sees existing comments

2. User types comment
   → Clicks "Add Comment"

3. Frontend sends:
   → Backend: POST /stories/:id/comments
   → Payload: { content, author, author_id, avatar_url }

4. Backend returns comment with timestamp

5. Frontend displays comment
   → Shows author, timestamp, content
   → User can edit or delete own comments
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Pattern

**Auth System:** Supabase Auth with JWT tokens

**Flow:**
1. User authenticates via Supabase Auth (frontend)
2. Frontend receives JWT token
3. Frontend includes token in all API requests: `Authorization: Bearer <token>`
4. Backend verifies JWT signature and expiration
5. Backend extracts user context from JWT claims

### 7.2 JWT Token Structure

**Token Claims:**
```json
{
  "sub": "user-uuid",           // User ID (use for author_id, created_by)
  "email": "user@example.com",
  "user_metadata": {
    "name": "John Doe",         // Display name (use for author)
    "avatar_url": "/avatar.png" // Avatar URL
  },
  "role": "authenticated",
  "iat": 1700000000,
  "exp": 1700003600
}
```

### 7.3 Backend Responsibilities

**For ALL authenticated endpoints:**
- Extract `user_id` from JWT `sub` claim
- Auto-populate `created_by`, `updated_by`, `author_id` fields
- Never trust client-provided user IDs

**For comment operations:**
```typescript
// Backend extracts from JWT:
const userId = jwt.sub;
const userName = jwt.user_metadata.name;
const userAvatar = jwt.user_metadata.avatar_url;

// Create comment:
const comment = {
  id: generateId(),
  story_id: storyId,
  author_id: userId,      // From JWT, not request body
  author: userName,       // From JWT, not request body
  avatar_url: userAvatar, // From JWT, not request body
  content: req.body.content,
  created_at: now(),
  updated_at: now()
};
```

**For listing comments:**
```typescript
// Backend adds is_current_user flag:
const comments = story.comments.map(comment => ({
  ...comment,
  is_current_user: comment.author_id === currentUserId
}));
```

### 7.4 Frontend Responsibilities

**What Frontend Sends:**
- ✅ JWT token in Authorization header
- ✅ Content/data fields only
- ❌ Never send `author_id`, `created_by`, `updated_by`

**What Frontend Receives:**
- Backend includes `is_current_user: boolean` flag on comments
- Frontend shows edit/delete buttons only when `is_current_user === true`

### 7.5 Authorization Rules

**Entity-Level Permissions:**
- All authenticated users can read all journeys/steps/stories/releases
- All authenticated users can create/update/delete any entity (collaborative tool)
- Comments can only be edited/deleted by their author

**Comment-Specific:**
- Any user can create comments on any story/release
- Only comment author can edit/delete their own comments
- Backend validates: `comment.author_id === jwt.sub`

---

## 8. Database Design Recommendations

### 7.1 PostgreSQL Schema (Relational)

```sql
-- Journeys Table
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#8B5CF6',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Steps Table
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(journey_id, sort_order)
);

-- Releases Table
CREATE TABLE releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  shipped BOOLEAN NOT NULL DEFAULT FALSE,
  is_unassigned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(is_unassigned) WHERE is_unassigned = TRUE  -- Only one unassigned
);

-- Stories Table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE SET DEFAULT,  -- Move to unassigned
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'NOT_READY',
  size INTEGER,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Embedded label (denormalized)
  label_id VARCHAR(50),
  label_name VARCHAR(100),
  label_color VARCHAR(7),
  
  INDEX(step_id, release_id)  -- Frequently queried together
);

-- Tags Table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Personas Table
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Story-Tags Junction Table (Many-to-Many)
CREATE TABLE story_tags (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, tag_id)
);

-- Story-Personas Junction Table (Many-to-Many)
CREATE TABLE story_personas (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, persona_id)
);

-- Story Links Table (Dependencies)
CREATE TABLE story_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  target_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL DEFAULT 'linked to',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(source_story_id, target_story_id)  -- No duplicate dependencies
);

-- Comments Table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  author_id VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (story_id IS NOT NULL OR release_id IS NOT NULL)  -- Must belong to something
);

-- Attachments Table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### 7.2 Indexes for Performance

```sql
-- Sorting indexes
CREATE INDEX idx_journeys_sort_order ON journeys(sort_order);
CREATE INDEX idx_steps_sort_order ON steps(journey_id, sort_order);
CREATE INDEX idx_releases_sort_order ON releases(sort_order);
CREATE INDEX idx_stories_sort_order ON stories(step_id, release_id, sort_order);

-- Foreign key indexes (for joins)
CREATE INDEX idx_steps_journey_id ON steps(journey_id);
CREATE INDEX idx_stories_step_id ON stories(step_id);
CREATE INDEX idx_stories_release_id ON stories(release_id);
CREATE INDEX idx_story_links_source ON story_links(source_story_id);
CREATE INDEX idx_story_links_target ON story_links(target_story_id);
CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_comments_release_id ON comments(release_id);

-- Status filtering
CREATE INDEX idx_stories_status ON stories(status);
```

---

### 7.3 Alternative: Document Store (MongoDB)

If using document-based storage:

```javascript
// Stories Collection (with embedded data)
{
  _id: "story-1",
  step_id: "step-1",
  release_id: "release-1",
  title: "View all chats",
  description: "As a user...",
  status: "DONE",
  size: 3,
  sort_order: 0,
  label: {
    id: "label-1",
    name: "Feature",
    color: "#3B82F6"
  },
  tags: [
    { id: "tag-1", name: "Frontend", color: "#10B981" }
  ],
  personas: [
    { id: "persona-1", name: "Admin", avatar_url: "..." }
  ],
  dependencies: [
    {
      id: "dep-1",
      source_story_id: "story-1",
      target_story_id: "story-4",
      link_type: "linked to",
      created_at: ISODate("2025-11-18")
    }
  ],
  comments: [
    {
      id: "comment-1",
      author_id: "user-1",
      author: "John Doe",
      content: "This is ready for review",
      created_at: ISODate("2025-11-18"),
      updated_at: ISODate("2025-11-18")
    }
  ],
  attachments: [],
  created_at: ISODate("2025-11-18"),
  updated_at: ISODate("2025-11-18")
}
```

**Pros:** Fewer joins, easier to serialize
**Cons:** Harder to query across relationships, potential data duplication

---

## 9. API Endpoint Recommendations

### 9.1 Authentication Headers

**All endpoints require:**
```
Authorization: Bearer <jwt_token>
```

**Backend must:**
1. Verify JWT signature
2. Check expiration
3. Extract user context
4. Return 401 if invalid/expired

### 9.2 RESTful API Structure

```
# Journeys
GET    /api/journeys              # List all journeys
GET    /api/journeys/:id          # Get one journey
POST   /api/journeys              # Create journey
PATCH  /api/journeys/:id          # Update journey
DELETE /api/journeys/:id          # Delete journey
POST   /api/journeys/:id/reorder  # Reorder journey

# Steps
GET    /api/steps                 # List all steps
GET    /api/journeys/:id/steps    # Steps for a journey
GET    /api/steps/:id             # Get one step
POST   /api/steps                 # Create step
PATCH  /api/steps/:id             # Update step
DELETE /api/steps/:id             # Delete step
POST   /api/steps/:id/reorder     # Reorder step

# Stories
GET    /api/stories               # List all stories
GET    /api/stories/:id           # Get one story (with nested data)
GET    /api/steps/:id/stories     # Stories in a step
GET    /api/releases/:id/stories  # Stories in a release
GET    /api/stories?step_id=X&release_id=Y  # Stories in cell
POST   /api/stories               # Create story
PATCH  /api/stories/:id           # Update story
DELETE /api/stories/:id           # Delete story
POST   /api/stories/:id/move      # Move story (special endpoint)

# Releases
GET    /api/releases              # List all releases
GET    /api/releases/:id          # Get one release
POST   /api/releases              # Create release
PATCH  /api/releases/:id          # Update release
DELETE /api/releases/:id          # Delete release
POST   /api/releases/:id/reorder  # Reorder release

# Dependencies
GET    /api/stories/:id/dependencies        # Get dependencies
POST   /api/stories/:id/dependencies        # Add dependency
DELETE /api/stories/:sourceId/dependencies/:targetId  # Remove

# Comments (JWT required)
GET    /api/stories/:id/comments            # Get comments (with is_current_user flag)
POST   /api/stories/:id/comments            # Add comment (author from JWT)
PATCH  /api/comments/:id                    # Update comment (auth check: must be author)
DELETE /api/comments/:id                    # Delete comment (auth check: must be author)

# Tags
GET    /api/tags                            # List all tags
POST   /api/tags                            # Create tag
DELETE /api/tags/:id                        # Delete tag

# Personas
GET    /api/personas                        # List all personas
POST   /api/personas                        # Create persona
DELETE /api/personas/:id                    # Delete persona

# Attachments
POST   /api/stories/:id/attachments         # Upload attachment
DELETE /api/attachments/:id                 # Delete attachment

# Analytics/Computed Data
GET    /api/releases/:id/stats              # Release statistics
GET    /api/releases/:id/progress           # Release progress
GET    /api/releases/at-risk                # At-risk releases
```

---

### 9.3 Detailed Endpoint Examples

#### POST /api/stories/:id/comments

**Request:**
```http
POST /api/stories/story-123/comments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "This is a great feature idea!"
}
```

**Backend Processing:**
```javascript
// 1. Verify JWT
const token = req.headers.authorization.split(' ')[1];
const jwt = verifyToken(token); // Returns decoded JWT

// 2. Extract user info from JWT
const userId = jwt.sub;
const userName = jwt.user_metadata.name;
const userAvatar = jwt.user_metadata.avatar_url;

// 3. Create comment
const comment = {
  id: generateId(),
  story_id: storyId,
  author_id: userId,      // From JWT, NOT from request body
  author: userName,        // From JWT, NOT from request body
  avatar_url: userAvatar, // From JWT, NOT from request body
  content: req.body.content,
  created_at: new Date(),
  updated_at: new Date()
};

// 4. Save to database
await db.comments.insert(comment);

// 5. Return with is_current_user flag
return {
  ...comment,
  is_current_user: true  // Always true for newly created
};
```

**Response:**
```json
{
  "id": "comment-456",
  "story_id": "story-123",
  "author_id": "user-789",
  "author": "John Doe",
  "avatar_url": "https://example.com/avatar.png",
  "content": "This is a great feature idea!",
  "created_at": "2025-11-18T10:30:00Z",
  "updated_at": "2025-11-18T10:30:00Z",
  "is_current_user": true
}
```

#### GET /api/stories/:id/comments

**Request:**
```http
GET /api/stories/story-123/comments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
```javascript
// 1. Verify JWT
const jwt = verifyToken(token);
const currentUserId = jwt.sub;

// 2. Get all comments for story
const comments = await db.comments.findByStoryId(storyId);

// 3. Add is_current_user flag to each comment
const commentsWithFlag = comments.map(comment => ({
  ...comment,
  is_current_user: comment.author_id === currentUserId
}));

return commentsWithFlag;
```

**Response:**
```json
[
  {
    "id": "comment-1",
    "story_id": "story-123",
    "author_id": "user-789",
    "author": "John Doe",
    "avatar_url": "https://example.com/avatar1.png",
    "content": "This is a great feature!",
    "created_at": "2025-11-18T10:30:00Z",
    "updated_at": "2025-11-18T10:30:00Z",
    "is_current_user": true
  },
  {
    "id": "comment-2",
    "story_id": "story-123",
    "author_id": "user-456",
    "author": "Jane Smith",
    "avatar_url": "https://example.com/avatar2.png",
    "content": "I have some concerns about this",
    "created_at": "2025-11-18T11:00:00Z",
    "updated_at": "2025-11-18T11:00:00Z",
    "is_current_user": false
  }
]
```

#### DELETE /api/releases/:id

**Request:**
```http
DELETE /api/releases/release-2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
```javascript
// 1. Verify JWT
const jwt = verifyToken(token);

// 2. Check if release exists and is not Unassigned
const release = await db.releases.findById(releaseId);
if (!release) {
  return { error: "Release not found", status: 404 };
}
if (release.is_unassigned) {
  return { error: "Cannot delete Unassigned release", status: 400 };
}

// 3. Get Unassigned release ID
const unassigned = await db.releases.findOne({ is_unassigned: true });

// 4. CRITICAL: Move all stories to Unassigned FIRST
const result = await db.stories.updateMany(
  { release_id: releaseId },
  { release_id: unassigned.id }
);
const storiesMoved = result.modifiedCount;

// 5. Now delete the release
await db.releases.delete(releaseId);

return {
  success: true,
  stories_moved: storiesMoved
};
```

**Response:**
```json
{
  "success": true,
  "stories_moved": 5
}
```

#### DELETE /api/stories/:id

**Request:**
```http
DELETE /api/stories/story-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
```javascript
// 1. Verify JWT
const jwt = verifyToken(token);

// 2. CRITICAL: Remove from ALL dependencies (both directions)
const dependenciesRemoved = await db.story_links.deleteMany({
  $or: [
    { source_story_id: storyId },
    { target_story_id: storyId }
  ]
});

// 3. Delete comments (cascade)
await db.comments.deleteMany({ story_id: storyId });

// 4. Delete attachments (cascade)
await db.attachments.deleteMany({ story_id: storyId });

// 5. Delete the story
await db.stories.delete(storyId);

return {
  success: true,
  dependencies_removed: dependenciesRemoved.deletedCount
};
```

**Response:**
```json
{
  "success": true,
  "dependencies_removed": 3
}
```

---

### 9.4 Batch Operations (Optional)

```
POST   /api/batch/stories/move     # Move multiple stories
POST   /api/batch/stories/update   # Update multiple stories
POST   /api/batch/stories/delete   # Delete multiple stories
```

---

### 9.5 GraphQL Alternative (Optional)

```graphql
query GetStoryMap {
  journeys {
    id
    name
    color
    steps {
      id
      name
      stories(releaseId: "release-1") {
        id
        title
        status
        dependencies {
          target { id title }
          linkType
        }
      }
    }
  }
  releases {
    id
    name
    stats {
      totalStories
      pointsRemaining
      unsizedCount
    }
  }
}
```

---

## Summary

### Key Design Decisions for Backend:

1. **Relational vs Document Store:**
   - Relational (PostgreSQL) recommended for complex relationships
   - Document store (MongoDB) viable if embedding is preferred

2. **Normalization:**
   - Core entities (Journey, Step, Story, Release) are normalized
   - Supporting entities (Label, Tag, Persona) can be normalized or embedded
   - Comments and Attachments can be separate tables or embedded

3. **Cascade Rules (CRITICAL):**
   - Journey delete → Cascade to Steps and Stories
   - Step delete → Cascade to Stories
   - ⚠️ Release delete → MUST move Stories to Unassigned before deleting
   - ⚠️ Story delete → MUST remove from ALL dependencies (source and target)

4. **Authentication:**
   - All endpoints require JWT token verification
   - Backend extracts user context from JWT, never trusts client
   - Comments: backend auto-populates author fields from JWT
   - Backend adds `is_current_user` flag to comments for UI permissions

5. **Sort Order:**
   - Stories: 1000-based spacing (1000, 2000, 3000, ...)
   - Other entities: Simple increment (0, 1, 2, ...)

6. **Performance:**
   - Index on sort_order fields
   - Index on foreign keys
   - Consider caching for computed stats

7. **Real-time:**
   - Consider WebSocket for live updates
   - Or use polling for simpler implementation

---

**End of Documentation**
