# Access Control System Reference (CASL)

This project uses **CASL (Code Access Security Library)** to implement a hybrid **RBAC** (Role-Based) and **ABAC** (Attribute-Based) access control system.

## Architecture Overview

The system is **isomorphic**: permissions are defined almost identically on both the Backend and Frontend to ensure consistency.

- **Backend**: `src/modules/auth/casl/ability.factory.ts`
- **Frontend**: `src/auth/ability.ts`

### Key Concepts
- **Subject**: The resource you want to access (e.g., `'TimeSheet'`, `'Employee'`).
- **Action**: What you want to do (e.g., `'read'`, `'create'`, `'update'`, `'manage'`).
- **Conditions**: Rules that must match (e.g., `{ userId: user.id }`).

---

## 1. Backend Implementation (`mi-casa-server`)

### location: `src/modules/auth/casl/ability.factory.ts`

This factory function `defineAbilityFor(user)` generates permissions based on the user's session data.

**Key Data Sources:**
- `user.role`: 'admin', 'hr', 'user', 'it'.
- `user.allowedScreens`: Array of strings (e.g., `['TimeSheets']`) acting as coarse-grained switches.
- `user.isSupervisor` & `user.directReports`: Used for Supervisor logic.

### Usage in Controllers
The `authMiddleware` injects the `ability` into the Hono context (`c.get('ability')`).

```typescript
// Example: Protecting a route
app.get('/timesheets/:id', async (c) => {
    const ability = c.get('ability');
    // ... fetch timesheet ...
    
    // Check permission
    if (ability.cannot('read', subject('TimeSheet', timesheet))) {
        return c.json({ message: 'Forbidden' }, 403);
    }
});
```

---

## 2. Frontend Implementation (`early-lamps-fly`)

### Location: `src/auth/ability.ts`

Mirrors the backend logic. Used by the UI to hide/show buttons and menu items.

### Integration: `src/App.tsx`
Refine's `accessControlProvider` delegates all checks to CASL:

```typescript
accessControlProvider={{
    can: async ({ resource, action }) => {
        // ... build ability ...
        return { can: ability.can(action, resource) };
    }
}}
```

---

## 3. Implemented Patterns (ABAC Examples)

### A. Ownership ("Only my own data")
User can only read/edit their own records.
```typescript
can('read', 'TimeSheet', { userId: user.id });
```

### B. Workflow Status ("Only draft can be edited")
Protects data integrity.
```typescript
can('update', 'TimeSheet', { 
    userId: user.id, 
    status: 'draft' // <--- Condition
});
```

### C. Supervisor Access ("My direct reports")
Uses arrays ($in operator) to match against a list of emails.
```typescript
if (user.isSupervisor) {
    can('read', 'TimeSheet', { 
        employeeEmail: { $in: user.directReports } 
    });
}
```

---

## 4. How to Add New Permissions

1.  **Backend**: Open `ability.factory.ts`.
    *   Add the new Subject type (optional, for TypeScript).
    *   Add the logic inside `defineAbilityFor`.
2.  **Frontend**: Open `src/auth/ability.ts`.
    *   Replicate the logic.
3.  **Frontend Resource**: Ensure the Refine resource in `App.tsx` matches the Subject name you used (or map it in `App.tsx` if names differ).

## 5. Metadata for Logic
The system relies on specific user metadata. Ensure these are synced correctly (e.g., from Microsoft Graph):
- `allowedScreens` (JSON string in DB)
- `directReports` (JSON string in DB, array of emails)
