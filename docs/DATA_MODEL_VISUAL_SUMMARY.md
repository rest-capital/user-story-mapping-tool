# Data Model Visual Summary

**Version:** 2.0 (Corrected)  
**Auth:** Supabase JWT-based authentication

Quick reference for the User Story Mapping Tool data structure.

---

## 🗂️ Entity Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    STORY MAP STRUCTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JOURNEY 1          JOURNEY 2          JOURNEY 3           │
│  ┌────┬────┬────┐  ┌────┬────┐       ┌────┬────┬────┐    │
│  │Step│Step│Step│  │Step│Step│       │Step│Step│Step│    │
│  │ 1  │ 2  │ 3  │  │ 4  │ 5  │       │ 6  │ 7  │ 8  │    │
│  └────┴────┴────┘  └────┴────┘       └────┴────┴────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ RELEASE 1 (MVP)                                       │ │
│  ├────┬────┬────┬────┬────┬────┬────┬────┬────┬────────┤ │
│  │ S  │ S  │ S  │    │ S  │ S  │    │ S  │    │  ...   │ │
│  │ S  │    │    │ S  │    │    │ S  │    │ S  │        │ │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ RELEASE 2                                             │ │
│  ├────┬────┬────┬────┬────┬────┬────┬────┬────┬────────┤ │
│  │ S  │ S  │    │ S  │ S  │    │ S  │    │ S  │  ...   │ │
│  │    │    │ S  │    │ S  │ S  │    │ S  │    │        │ │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ UNASSIGNED                                            │ │
│  ├────┬────┬────┬────┬────┬────┬────┬────┬────┬────────┤ │
│  │ S  │    │ S  │    │ S  │    │    │ S  │    │  ...   │ │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────────┘ │
│                                                             │
│  S = Story Card                                            │
└─────────────────────────────────────────────────────────────┘

Grid Position: Story = (Step, Release) cell coordinate
```

---

## 📊 Entity Relationship Diagram

```
                    ┌─────────────┐
                    │   JOURNEY   │
                    │  (1. Main)  │
                    └──────┬──────┘
                           │ 1:N
                           ↓
                    ┌─────────────┐
                    │    STEP     │
                    │ (Activity)  │
                    └──────┬──────┘
                           │ 1:N
                           ↓
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   RELEASE   │  │    STORY    │  │     TAG     │
    │  (Sprint)   │→1:N│  (Task)     │←N:M│ (Category) │
    └─────────────┘  └──────┬──────┘  └─────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ↓           ↓           ↓
         ┌──────────┐ ┌─────────┐ ┌──────────┐
         │ COMMENT  │ │STORY    │ │ATTACHMENT│
         │          │ │LINK     │ │          │
         └──────────┘ └─────────┘ └──────────┘
                         Self-ref
                         (Dependency)
```

---

## 🏗️ Core Entities Summary

| Entity | Key Fields | Relationships | Cascade Behavior |
|--------|-----------|---------------|------------------|
| **Journey** | `id`, `name`, `color`, `sort_order` | 1:N → Steps | Delete cascades to Steps & Stories |
| **Step** | `id`, `journey_id`, `name`, `sort_order` | N:1 Journey<br>1:N → Stories | Delete cascades to Stories |
| **Story** | `id`, `step_id`, `release_id`, `title`, `status`, `size` (1000-based sort_order) | N:1 Step<br>N:1 Release<br>N:M Tags<br>Self-ref Dependencies | ⚠️ Delete removes ALL dependencies (both directions) |
| **Release** | `id`, `name`, `start_date`, `due_date`, `shipped`, `is_unassigned` | 1:N → Stories | ⚠️ Delete moves Stories to Unassigned (NOT cascade) |
| **Tag** | `id`, `name`, `color` | N:M Stories | Delete removes from Stories |
| **Persona** | `id`, `name`, `avatar_url` | N:M Stories | Delete removes from Stories |

---

## 🎯 Story Card Anatomy

```
┌─────────────────────────────────────┐
│ 🏷️ LABEL                           │  ← Label (color + name)
├─────────────────────────────────────┤
│                                     │
│  Story Title Here                   │  ← Title (required)
│                                     │
│  Description text goes here...      │  ← Description
│                                     │
├─────────────────────────────────────┤
│ 📊 Status: READY                    │  ← Status enum
│ 🎯 Size: 5 pts                      │  ← Story points
├─────────────────────────────────────┤
│ 🏷️ Tag1 • Tag2 • Tag3              │  ← Tags (N:M)
│ 👤 Persona1 • Persona2              │  ← Personas (N:M)
├─────────────────────────────────────┤
│ 🔗 Depends on: Story-4              │  ← Dependencies
│ 🔗 Linked to: Story-6               │
├─────────────────────────────────────┤
│ 💬 3 Comments                       │  ← Comments (author from JWT)
│ 📎 2 Attachments                    │  ← Attachments
└─────────────────────────────────────┘
```

**Sort Order Note:** Stories use 1000-based spacing (1000, 2000, 3000...) to allow insertions without reordering.

---

## 🔄 Story Status Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  NOT_READY   │────→│    READY     │────→│ IN_PROGRESS  │
└──────────────┘     └──────────────┘     └───────┬──────┘
                                                   │
                                                   ↓
                           ┌──────────────┐     ┌──────────────┐
                           │   BLOCKED    │←────│     DONE     │
                           └──────────────┘     └──────────────┘
```

---

## 📐 Grid Coordinate System

**Story Position = (Step, Release)**

```
               Step-1   Step-2   Step-3   Step-4
               ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
               │     │  │     │  │     │  │     │
               └─────┘  └─────┘  └─────┘  └─────┘
Release-1      ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
               │(1,1)│  │(2,1)│  │(3,1)│  │(4,1)│
               └─────┘  └─────┘  └─────┘  └─────┘
Release-2      ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
               │(1,2)│  │(2,2)│  │(3,2)│  │(4,2)│
               └─────┘  └─────┘  └─────┘  └─────┘
Release-3      ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
               │(1,3)│  │(2,3)│  │(3,3)│  │(4,3)│
               └─────┘  └─────┘  └─────┘  └─────┘

Cell (2,2) = Stories at Step-2 AND Release-2
Within each cell, stories ordered by sort_order (top to bottom)
```

---

## 🔗 Dependency Link Types

**Runtime Values (UI):**
- `"linked to"` → General dependency (shows curved line)
- `"blocks"` → Source blocks target
- `"is blocked by"` → Source blocked by target
- `"duplicates"` → Source duplicates target
- `"is duplicated by"` → Source duplicated by target

**⚠️ Note:** TypeScript enum defines different values (tech debt)

---

## 📊 Computed Metrics

### Release Statistics
```typescript
totalStories: 12       // Count all stories in release
pointsRemaining: 45    // Sum of non-DONE story sizes
unsizedCount: 3        // Stories with no size value

Display: "12 STORIES • 45 PTS • (3 UNSIZED)"
```

### Release Progress
```typescript
completedStories: 8    // Stories with status = DONE
totalStories: 12
progressPercent: 67%   // (8/12) * 100

releaseLengthDays: 45  // due_date - start_date
isDueInDays: 12        // due_date - today
isOverdue: false       // isDueInDays < 0
```

---

## 🎨 Color Coding

**Journeys:**
- Default: `#8B5CF6` (Purple)
- Custom per journey

**Labels:**
- Feature: `#3B82F6` (Blue)
- Bug: `#EF4444` (Red)
- Enhancement: `#10B981` (Green)
- Custom colors supported

**Tags:**
- Custom colors per tag

**Dependency Lines:**
- Purple: `#A855F7`
- S-curve connectors

---

## 🔢 Sort Order Logic

**Journeys:**
- `sort_order` = 0, 1, 2, ... (left to right)

**Steps:**
- `sort_order` relative within journey
- Journey-1: steps 0, 1, 2
- Journey-2: steps 0, 1, 2

**Releases:**
- `sort_order` = 0, 1, 2, ...
- Unassigned always has highest sort_order (bottom)

**Stories:**
- `sort_order` relative within cell
- Cell (step-1, release-1): stories 0, 1, 2
- Cell (step-2, release-1): stories 0, 1, 2

---

## 🚀 Drag & Drop Patterns

```
┌─────────────────────────────────────────────────────────┐
│  HORIZONTAL DRAG (change step, same release)           │
│  ┌─────┐     ┌─────┐                                   │
│  │  S  │────→│     │  Story moves right                │
│  └─────┘     └─────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  VERTICAL DRAG (same step, change release)             │
│  ┌─────┐                                                │
│  │  S  │  Story moves down to next release             │
│  └──┬──┘                                                │
│     │                                                    │
│     ↓                                                    │
│  ┌─────┐                                                │
│  │     │                                                │
│  └─────┘                                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  DIAGONAL DRAG (change both step and release)          │
│  ┌─────┐                                                │
│  │  S  │───┐                                            │
│  └─────┘   │                                            │
│            ↘                                            │
│         ┌─────┐                                         │
│         │     │  Story moves diagonal                   │
│         └─────┘                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  REORDER (same cell, change position)                  │
│  ┌─────┐                                                │
│  │  S1 │  ↕  Swap positions                            │
│  ├─────┤                                                │
│  │  S2 │  ↕  within same cell                          │
│  ├─────┤                                                │
│  │  S3 │                                                │
│  └─────┘                                                │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Create Story Flow

```
User clicks "+" in cell → Dialog opens
     ↓
Pre-filled: step_id, release_id
     ↓
User enters: title, description
     ↓
Submit → POST /api/stories
     ↓
Backend creates story with defaults:
  - id: auto-generated
  - status: NOT_READY
  - label: { name: "Story", color: "#3B82F6" }
  - tags: []
  - personas: []
  - dependencies: []
  - comments: []
  - attachments: []
  - sort_order: auto-increment in cell
     ↓
Frontend displays story card in grid
```

---

## 🔐 Authentication Pattern

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                               │
│  ┌──────────────────────────────────────┐              │
│  │ User authenticated via Supabase Auth │              │
│  └──────────────┬───────────────────────┘              │
│                 ↓                                        │
│         JWT Token received                              │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐              │
│  │ All API requests include:            │              │
│  │ Authorization: Bearer <jwt_token>    │              │
│  └──────────────┬───────────────────────┘              │
└─────────────────┼───────────────────────────────────────┘
                  ↓
┌─────────────────┼───────────────────────────────────────┐
│  BACKEND        ↓                                       │
│  ┌──────────────────────────────────────┐              │
│  │ 1. Verify JWT signature & expiration │              │
│  └──────────────┬───────────────────────┘              │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐              │
│  │ 2. Extract from JWT:                 │              │
│  │    - user_id (from 'sub' claim)      │              │
│  │    - name (from user_metadata)       │              │
│  │    - avatar_url (from user_metadata) │              │
│  └──────────────┬───────────────────────┘              │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐              │
│  │ 3. Auto-populate fields:             │              │
│  │    - author_id = user_id             │              │
│  │    - author = name                   │              │
│  │    - created_by = user_id            │              │
│  └──────────────┬───────────────────────┘              │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐              │
│  │ 4. Add is_current_user flag to       │              │
│  │    comments in responses             │              │
│  └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘

Frontend sends: { content: "Great idea!" }
Backend creates: {
  id: "...",
  story_id: "...",
  author_id: "user-123",      // From JWT
  author: "John Doe",          // From JWT
  avatar_url: "/avatar.png",   // From JWT
  content: "Great idea!",
  created_at: "...",
  updated_at: "...",
  is_current_user: true        // Added by backend
}
```

---

## 🗄️ Database Tables (PostgreSQL)

```
journeys
├── id (PK)
├── name (unique)
├── color
├── sort_order
└── timestamps

steps
├── id (PK)
├── journey_id (FK → journeys.id, CASCADE)
├── name
├── sort_order
└── timestamps

releases
├── id (PK)
├── name
├── start_date, due_date
├── shipped
├── is_unassigned (unique constraint)
├── sort_order
└── timestamps

stories
├── id (PK)
├── step_id (FK → steps.id, CASCADE)
├── release_id (FK → releases.id, NO ACTION - handled by app)
├── title
├── description
├── status (enum)
├── size
├── sort_order (1000-based spacing: 1000, 2000, 3000...)
├── label_* (embedded)
└── timestamps

⚠️ CRITICAL: On DELETE release → app must UPDATE stories SET release_id = unassigned_id
⚠️ CRITICAL: On DELETE story → app must DELETE FROM story_links WHERE source OR target

tags
├── id (PK)
├── name (unique)
├── color
└── created_at

personas
├── id (PK)
├── name
├── description
├── avatar_url
└── created_at

story_tags (junction)
├── story_id (FK, CASCADE)
└── tag_id (FK, CASCADE)

story_personas (junction)
├── story_id (FK, CASCADE)
└── persona_id (FK, CASCADE)

story_links (dependencies)
├── id (PK)
├── source_story_id (FK, CASCADE)
├── target_story_id (FK, CASCADE)
├── link_type
└── created_at

comments
├── id (PK)
├── story_id (FK, CASCADE, nullable)
├── release_id (FK, CASCADE, nullable)
├── author_id
├── author
├── content
└── timestamps

attachments
├── id (PK)
├── story_id (FK, CASCADE)
├── file_name
├── file_url
├── file_type
├── file_size
└── created_at
```

---

## 📡 API Endpoints Summary

**All endpoints require:** `Authorization: Bearer <jwt_token>`

```
Journeys:     /api/journeys                    CRUD + reorder
Steps:        /api/steps                       CRUD + reorder
Stories:      /api/stories                     CRUD + move + queries
              ⚠️ DELETE → removes ALL dependencies (both directions)
Releases:     /api/releases                    CRUD + reorder
              ⚠️ DELETE → moves stories to Unassigned first
Tags:         /api/tags                        CR-D (no update)
Personas:     /api/personas                    CR-D
Dependencies: /api/stories/:id/dependencies    Create/Delete
Comments:     /api/stories/:id/comments        CRUD (auth: author only)
              POST body: { content }           ← Only content, author from JWT
              Response adds: is_current_user   ← For UI permissions
Attachments:  /api/stories/:id/attachments     CRUD
Analytics:    /api/releases/:id/stats          Read-only
```

### Comment Create Example

**Frontend sends:**
```json
POST /api/stories/story-123/comments
Authorization: Bearer eyJhbG...
{ "content": "Great idea!" }
```

**Backend responds:**
```json
{
  "id": "comment-456",
  "story_id": "story-123",
  "author_id": "user-789",      // Extracted from JWT
  "author": "John Doe",          // Extracted from JWT
  "avatar_url": "/avatar.png",   // Extracted from JWT
  "content": "Great idea!",
  "created_at": "2025-11-18T...",
  "updated_at": "2025-11-18T...",
  "is_current_user": true        // Computed by backend
}
```

---

**For full details, see:** `/DATA_MODEL_COMPREHENSIVE.md`
