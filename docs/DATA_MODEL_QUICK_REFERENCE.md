# Data Model Quick Reference Card

**Version:** 2.0 (Corrected)  
**Auth:** Supabase JWT (all endpoints require `Authorization: Bearer <token>`)

**One-page cheat sheet for backend API design**

---

## 🎯 Core Entities (6)

| Entity | Purpose | Key Fields | Sort Order | Unique Constraints |
|--------|---------|------------|------------|-------------------|
| **Journey** | User workflow group | `name`, `sort_order`, `color` | 0, 1, 2... | `name` unique |
| **Step** | Activity in journey | `journey_id`, `name`, `sort_order` | 0, 1, 2... | None |
| **Story** | User story/task | `step_id`, `release_id`, `title`, `status`, `size` | **1000, 2000, 3000...** | None |
| **Release** | Sprint/iteration | `name`, `start_date`, `due_date`, `is_unassigned` | 0, 1, 2... | `is_unassigned` (only 1 true) |
| **Tag** | Category label | `name`, `color` | N/A | `name` unique |
| **Persona** | User role | `name`, `avatar_url` | N/A | None |

---

## 🔗 Relationships

```
Journey (1) → (N) Steps
Step (1) → (N) Stories
Release (1) → (N) Stories
Story (N) ↔ (N) Tags (junction table)
Story (N) ↔ (N) Personas (junction table)
Story (N) → (N) Story (dependencies, self-ref)
Story (1) → (N) Comments
Story (1) → (N) Attachments
```

---

## 💾 Database Cascade Rules

| Delete | What Happens | Critical Implementation |
|--------|-------------|------------------------|
| Journey | → Cascade delete Steps → Cascade delete Stories | Standard CASCADE |
| Step | → Cascade delete Stories | Standard CASCADE |
| Release | → Move Stories to Unassigned release (soft cascade) | ⚠️ **MUST**: `UPDATE stories SET release_id = unassigned WHERE release_id = ?` BEFORE `DELETE FROM releases` |
| Story | → Remove from all dependencies, delete comments/attachments | ⚠️ **MUST**: `DELETE FROM story_links WHERE source_story_id = ? OR target_story_id = ?` BEFORE deleting story |
| Tag | → Remove from all stories (soft) | `DELETE FROM story_tags WHERE tag_id = ?` |
| Persona | → Remove from all stories (soft) | `DELETE FROM story_personas WHERE persona_id = ?` |

---

## 📊 Story Properties

**Required:**
- `id`, `step_id`, `release_id`, `title`, `status`, `label`, `sort_order`

**Optional:**
- `description`, `size`, `tags`, `personas`, `dependencies`, `comments`, `attachments`

**Enums:**
- `status`: `NOT_READY` | `READY` | `IN_PROGRESS` | `DONE` | `BLOCKED`

**Defaults:**
- `status`: `NOT_READY`
- `label`: `{ name: "Story", color: "#3B82F6" }`
- Arrays: `[]`

---

## 🎨 Story Status Enum

```typescript
NOT_READY     // Gray - Not ready to start
READY         // Blue - Ready to be picked up
IN_PROGRESS   // Yellow - Being worked on
DONE          // Green - Completed ✓
BLOCKED       // Red - Blocked by issue
```

---

## 🔗 Dependency Types

**⚠️ Important:** Use string literals, NOT enum values!

```javascript
// Runtime values (correct):
"linked to"         // General dependency
"blocks"            // Source blocks target
"is blocked by"     // Source blocked by target
"duplicates"        // Duplicate story
"is duplicated by"  // Duplicated by another

// ❌ Don't use: StoryLinkType.DEPENDENCY (enum value)
```

---

## 📐 Grid Position Logic

**Story Position = (step_id, release_id)**

- Horizontal axis = Steps (within Journeys)
- Vertical axis = Releases
- Each cell can contain multiple stories (sorted by `sort_order`)

**Query for cell:**
```sql
SELECT * FROM stories 
WHERE step_id = ? AND release_id = ?
ORDER BY sort_order;
```

---

## 🔄 CRUD Patterns

### Create
**Send:** Minimal required fields  
**Receive:** Complete object with defaults  
**Side Effect:** Auto-generate `id`, `sort_order`, timestamps

### Read
**Patterns:**
- Single: `GET /entity/:id`
- List: `GET /entities`
- Filtered: `GET /entities?filter=value`
- Nested: `GET /parent/:id/children`

### Update
**Type:** Partial (PATCH semantics)  
**Send:** Only changed fields  
**Receive:** Complete updated object  
**Side Effect:** Update `updated_at`

### Delete
**Type:** Hard delete (with cascades)  
**Receive:** `{ success: true }`  
**Side Effect:** Cascade per rules above

---

## 📊 Computed Data (Backend Recommended)

### Release Stats
```typescript
{
  totalStories: number,      // COUNT(stories)
  pointsRemaining: number,   // SUM(size) WHERE status != 'DONE'
  unsizedCount: number       // COUNT WHERE size IS NULL
}
```

### Release Progress
```typescript
{
  completedStories: number,  // COUNT WHERE status = 'DONE'
  totalStories: number,
  progressPercent: number,   // (completed / total) * 100
  isDueInDays: number,       // due_date - today
  isOverdue: boolean         // isDueInDays < 0
}
```

### Story Count by Status
```typescript
{
  NOT_READY: number,
  READY: number,
  IN_PROGRESS: number,
  DONE: number,
  BLOCKED: number
}
```

---

## 🚀 API Endpoints

**All endpoints require:** `Authorization: Bearer <jwt_token>`

### Journeys
```
GET    /api/journeys              List all
POST   /api/journeys              Create
PATCH  /api/journeys/:id          Update
DELETE /api/journeys/:id          Delete (cascades to steps & stories)
```

### Steps
```
GET    /api/steps                 List all
GET    /api/journeys/:id/steps    By journey
POST   /api/steps                 Create
PATCH  /api/steps/:id             Update
DELETE /api/steps/:id             Delete (cascades to stories)
```

### Stories
```
GET    /api/stories               List all
GET    /api/stories/:id           Get one (with nested data)
GET    /api/steps/:id/stories     By step
GET    /api/releases/:id/stories  By release
GET    /api/stories?step_id=X&release_id=Y  By cell
POST   /api/stories               Create
PATCH  /api/stories/:id           Update/move
DELETE /api/stories/:id           Delete
                                  ⚠️ Returns: { success, dependencies_removed: number }
```

### Releases
```
GET    /api/releases              List all
POST   /api/releases              Create
PATCH  /api/releases/:id          Update
DELETE /api/releases/:id          Delete
                                  ⚠️ Returns: { success, stories_moved: number }
                                  ⚠️ Cannot delete if is_unassigned = true
```

### Dependencies
```
GET    /api/stories/:id/dependencies           Get all
POST   /api/stories/:id/dependencies           Add
        Body: { target_story_id, link_type }
DELETE /api/stories/:sid/dependencies/:tid     Remove
```

### Comments (JWT Auth Required)
```
GET    /api/stories/:id/comments               Get all (with is_current_user flag)
POST   /api/stories/:id/comments               Create
        Body: { content }                       ← ONLY content
        Backend extracts from JWT:
          - author_id (from 'sub' claim)
          - author (from user_metadata.name)
          - avatar_url (from user_metadata.avatar_url)
        Response: { ...comment, is_current_user: boolean }
        
PATCH  /api/comments/:id                       Update (must be author)
        Body: { content }
        Backend validates: comment.author_id === jwt.sub
        
DELETE /api/comments/:id                       Delete (must be author)
        Backend validates: comment.author_id === jwt.sub
```

### Analytics
```
GET    /api/releases/:id/stats                 Release stats
GET    /api/releases/:id/progress              Release progress
GET    /api/releases/at-risk                   At-risk releases
```

---

## 🔢 Sort Order Rules

**⚠️ Different patterns for different entities:**

### Stories: 1000-Based Spacing
```javascript
// For new story in cell, set sort_order to:
sort_order = (COUNT(existing_stories_in_cell) + 1) * 1000
// Results in: 1000, 2000, 3000, 4000, ...

// WHY? Allows insertion without reordering:
// Insert between 2000 and 3000 → use 2500
// No need to update other stories
```

### Other Entities: Simple Increment
```javascript
// For Journey, Step, Release:
sort_order = COUNT(existing_items)
// Results in: 0, 1, 2, 3, ...
```

**Scope:**
- Journeys: Global scope
- Steps: Within journey
- Releases: Global scope (Unassigned always 9999)
- Stories: Within cell (step_id, release_id)

**Reordering:**
- Stories: Can insert between without reordering all
- Others: Simple sequential reorder

---

## 🔐 Authentication Pattern

### JWT Token Flow
```
1. Frontend authenticates via Supabase Auth
2. Receives JWT token
3. Includes in all requests: Authorization: Bearer <token>
4. Backend verifies signature & expiration
5. Backend extracts user context from JWT claims:
   - user_id from 'sub' claim
   - name from 'user_metadata.name'
   - avatar_url from 'user_metadata.avatar_url'
```

### Backend Auto-Population
```javascript
// Backend NEVER trusts client-provided user IDs
const userId = jwt.sub;                    // From token
const userName = jwt.user_metadata.name;   // From token
const userAvatar = jwt.user_metadata.avatar_url; // From token

// Auto-populate on create:
created_by = userId;
author_id = userId;    // For comments
author = userName;      // For comments
avatar_url = userAvatar; // For comments
```

### Comment Permissions
```javascript
// Frontend sends ONLY content:
POST /api/stories/:id/comments
Body: { content: "Great idea!" }

// Backend responds with is_current_user flag:
{
  id: "...",
  author_id: "user-123",  // From JWT
  author: "John Doe",      // From JWT
  avatar_url: "...",       // From JWT
  content: "Great idea!",
  is_current_user: true    // If author_id === current user
}

// Frontend uses is_current_user to show edit/delete buttons
```

---

## 🎯 Special Rules

### Unassigned Release
```javascript
{
  id: "unassigned",
  name: "Unassigned",
  is_unassigned: true,    // Only one can be true
  sort_order: 999999,     // Always at bottom
  // Cannot be deleted
}
```

### Label (Embedded in Story)
```javascript
{
  id: "label-1",
  name: "Feature",
  color: "#3B82F6"
}
// Not a separate table
```

---

## 📊 Sample Data Counts

**Initial dataset:**
- 2 Journeys
- 7 Steps (4 in Journey-1, 3 in Journey-2)
- 4 Releases (3 regular + Unassigned)
- 15 Stories (12 in regular releases, 3 in Unassigned)
- 3 Dependencies

---

## 🔍 Key Queries

### Get all data for story map
```sql
-- Journeys with steps
SELECT j.*, 
       (SELECT json_agg(s ORDER BY s.sort_order) 
        FROM steps s WHERE s.journey_id = j.id) as steps
FROM journeys j
ORDER BY j.sort_order;

-- Releases
SELECT * FROM releases ORDER BY sort_order;

-- Stories with counts
SELECT r.id, r.name, COUNT(s.id) as story_count
FROM releases r
LEFT JOIN stories s ON s.release_id = r.id
GROUP BY r.id;
```

### Get stories by cell
```sql
SELECT * FROM stories
WHERE step_id = ?
  AND release_id = ?
ORDER BY sort_order;
```

### Get dependencies for story
```sql
-- Direct dependencies (what this story depends on)
SELECT sl.*, 
       s.title as target_title,
       s.status as target_status
FROM story_links sl
JOIN stories s ON s.id = sl.target_story_id
WHERE sl.source_story_id = ?;

-- Reverse dependencies (what depends on this story)
SELECT sl.*,
       s.title as source_title,
       s.status as source_status
FROM story_links sl
JOIN stories s ON s.id = sl.source_story_id
WHERE sl.target_story_id = ?;
```

---

## 🛠️ Indexes (PostgreSQL)

```sql
-- Sort order indexes
CREATE INDEX idx_journeys_sort ON journeys(sort_order);
CREATE INDEX idx_steps_sort ON steps(journey_id, sort_order);
CREATE INDEX idx_releases_sort ON releases(sort_order);
CREATE INDEX idx_stories_sort ON stories(step_id, release_id, sort_order);

-- Foreign key indexes
CREATE INDEX idx_steps_journey ON steps(journey_id);
CREATE INDEX idx_stories_step ON stories(step_id);
CREATE INDEX idx_stories_release ON stories(release_id);
CREATE INDEX idx_story_links_source ON story_links(source_story_id);
CREATE INDEX idx_story_links_target ON story_links(target_story_id);

-- Query optimization
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_cell ON stories(step_id, release_id);
```

---

## ⚡ Performance Tips

1. **Batch operations:** Support moving multiple stories at once
2. **Eager loading:** Include nested data in single query
3. **Caching:** Cache release stats (update on story changes)
4. **Pagination:** For large datasets, paginate story lists
5. **Indexes:** Index foreign keys and sort_order fields

---

## 🚨 Critical Gotchas

1. **⚠️ Release DELETE:** MUST move stories to Unassigned BEFORE deleting
   ```sql
   UPDATE stories SET release_id = (SELECT id FROM releases WHERE is_unassigned = true)
   WHERE release_id = ?;
   DELETE FROM releases WHERE id = ?;
   ```

2. **⚠️ Story DELETE:** MUST remove from ALL dependencies (both directions)
   ```sql
   DELETE FROM story_links 
   WHERE source_story_id = ? OR target_story_id = ?;
   DELETE FROM stories WHERE id = ?;
   ```

3. **⚠️ Comment CREATE:** Backend extracts author from JWT, not request body
   - Frontend sends: `{ content }`
   - Backend adds: `author_id`, `author`, `avatar_url` from JWT

4. **⚠️ Sort Order:** Stories use 1000-based spacing, others use 0-based increment

5. **Dependency link_type:** Use `"linked to"` NOT `StoryLinkType.DEPENDENCY`

6. **Unassigned release:** Must always exist, cannot be deleted

7. **Cascade deletes:** Journey delete cascades to steps AND stories

8. **Story position:** Defined by (step_id, release_id) pair

9. **JWT required:** All endpoints require `Authorization: Bearer <token>`

10. **is_current_user flag:** Backend must add this to comment responses

---

## 📚 Full Documentation

- **Comprehensive:** `/DATA_MODEL_COMPREHENSIVE.md` (complete specs with auth)
- **Visual:** `/DATA_MODEL_VISUAL_SUMMARY.md` (diagrams + auth flow)
- **Quick Ref:** `/DATA_MODEL_QUICK_REFERENCE.md` (this file)

---

**Version:** 2.0 (Corrected)  
**Last Updated:** 2025-11-18
