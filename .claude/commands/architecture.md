# Tradely Architecture Skill

When invoked, use this document to scaffold, review, or enforce architecture conventions for any new TradelyX-pattern project (Express backend, Drizzle, React Native app, or React admin portal).

---

## What This Architecture Is

### Backend — Modular Express MVC

The backend uses **co-located modular MVC**: each feature module owns its route, controller, and helpers in one folder. There is no traditional "View" layer — responses are JSON. The "Model" lives in `/db/schemas/` (shared Drizzle ORM schemas). This is the correct Express equivalent of MVC.

> Named: **Modular Express MVC** (feature-first, co-located)

### Frontend (React Native) — Feature-Sliced Atomic Design

Two complementary patterns work together:

1. **Atomic Components** in `/components/` — primitive, reusable UI pieces (Buttons, Inputs, Cards, Text, etc.) with no business logic
2. **Feature Slice Modules** in `/screens/` — each feature owns its screen components, custom hooks, validation schemas, Redux/RTK Query services, and types in one folder

> Named: **Feature-Sliced Atomic Design** (atoms in /components, feature slices in /screens)

---

## Backend Structure Template

```
src/
├── index.ts                      # Express app entry, Socket.IO setup
├── config/                       # App-level config (env, db, third-party keys)
├── constants/                    # App-wide constants
├── db/
│   ├── schemas/                  # All Drizzle ORM table definitions (shared)
│   │   └── [feature]Schema.ts
│   └── index.ts                  # DB connection export
├── modules/                      # Feature modules (one folder per feature)
│   └── [feature]/
│       ├── index.ts              # REQUIRED: barrel export of router
│       ├── route.ts              # Express router + middleware wiring
│       ├── controller.ts         # Request handlers (one per endpoint)
│       ├── service.ts            # Business logic (optional, extract when controller grows)
│       ├── types.ts              # TypeScript interfaces for this module
│       └── __tests__/
├── middlewares/                  # Cross-module Express middleware
│   ├── authMiddleware.ts
│   └── validationMiddleware.ts
├── services/                     # Cross-module services (email, OTP, upload, etc.)
├── events/                       # Socket.IO event handlers
├── utils/                        # Pure utility functions
└── types/                        # Shared TypeScript types
```

### Backend Module Anatomy

Every module MUST follow this pattern:

**`modules/[feature]/route.ts`**

```typescript
import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { getItems, createItem } from "./controller";

const router = Router();

router.get("/", authMiddleware, getItems);
router.post("/", authMiddleware, createItem);

export default router;
```

**`modules/[feature]/controller.ts`**

```typescript
import { Request, Response } from "express";
import { db } from "../../db";
import { itemsTable } from "../../db/schemas/itemsSchema";

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(itemsTable);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
```

**`modules/[feature]/index.ts`** — makes the module detachable

```typescript
export { default as featureRouter } from "./route";
export * from "./types";
```

**Registering in `index.ts`**

```typescript
import { featureRouter } from "./modules/feature";
app.use("/api/feature", featureRouter);
```

### Backend Module Detachability Rules

A module is plug-and-play when it satisfies ALL of these:

1. **Single entry point** — only export from `index.ts`; no other file imports directly into sibling modules
2. **No sibling imports** — never `import from '../otherModule/controller'`. Use shared `/services/` or `/middlewares/` instead
3. **Self-contained types** — each module has its own `types.ts`; share only via top-level `/types/`
4. **Schema isolation** — a module reads only its own schema + any foreign key schemas it explicitly depends on
5. **Listed dependencies** — add a comment block at the top of `index.ts`:

```typescript
/**
 * @module feature
 * @depends authMiddleware, db/schemas/featureSchema
 * @routes /api/feature
 */
```

To extract a module to another project: copy the folder, update the dependency imports, register the router in the new app's `index.ts`.

---

## Frontend (React Native) Structure Template

```
src/
├── components/                   # Atomic, reusable UI (NO business logic here)
│   ├── Buttons/
│   │   ├── Button.tsx
│   │   ├── index.ts              # Barrel export
│   │   └── types.ts
│   ├── Inputs/
│   ├── Cards/
│   ├── Containers/
│   ├── Text/
│   └── [PrimitiveType]/          # One folder per UI primitive category
├── screens/                      # Feature slice modules
│   └── [feature]_screens/
│       ├── FeatureScreen.tsx     # Screen component (UI only, calls hooks)
│       ├── hooks/
│       │   └── useFeatureAction.ts
│       ├── services/
│       │   ├── featureSlice.ts   # Redux slice + RTK Query endpoints
│       │   └── types.ts
│       ├── schema/
│       │   └── featureValidationSchema.ts
│       ├── index.ts              # REQUIRED: barrel export
│       └── __tests__/
├── navigation/
│   ├── AppNavigationContainer.tsx
│   ├── stack/
│   │   └── [feature]_stack/[Feature]Stack.tsx
│   └── bottom_tab/
│       └── MainAppBottomTab.tsx
├── store/
│   ├── store.tsx                 # Redux store config
│   └── emptyApi.ts               # RTK Query base API
├── hooks/                        # Global hooks (shared across features)
├── services/                     # Global services (socket, deepLink, etc.)
├── constants/                    # App-wide constants
├── types/                        # Shared TypeScript types
└── utils/                        # Pure utility functions
```

### Frontend Feature Module Anatomy

**`screens/[feature]_screens/FeatureScreen.tsx`** — UI only

```typescript
import React from 'react';
import { View } from 'react-native';
import Button from '@tradely/components/Buttons/Button';
import { useFeatureAction } from './hooks/useFeatureAction';

const FeatureScreen = () => {
  const { handleSubmit, isLoading } = useFeatureAction();
  return (
    <View>
      <Button onPress={handleSubmit} loading={isLoading} label="Submit" />
    </View>
  );
};

export default FeatureScreen;
```

**`screens/[feature]_screens/hooks/useFeatureAction.ts`** — all business logic

```typescript
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import { featureValidationSchema } from "../schema/featureValidationSchema";
import { useCreateFeatureMutation } from "../services/featureSlice";

export const useFeatureAction = () => {
  const dispatch = useDispatch();
  const [createFeature, { isLoading }] = useCreateFeatureMutation();

  const formik = useFormik({
    initialValues: { name: "" },
    validationSchema: featureValidationSchema,
    onSubmit: async (values) => {
      await createFeature(values);
    },
  });

  return { handleSubmit: formik.handleSubmit, isLoading };
};
```

**`screens/[feature]_screens/services/featureSlice.ts`** — state + API

```typescript
import { emptyApi } from "@tradely/store/emptyApi";
import { createSlice } from "@reduxjs/toolkit";

const featureApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    createFeature: builder.mutation({
      query: (body) => ({ url: "/feature", method: "POST", body }),
    }),
    getFeatures: builder.query({ query: () => "/feature" }),
  }),
});

export const { useCreateFeatureMutation, useGetFeaturesQuery } = featureApi;
```

**`screens/[feature]_screens/index.ts`** — makes the module detachable

```typescript
export { default as FeatureScreen } from "./FeatureScreen";
export * from "./services/featureSlice";
export * from "./services/types";
```

### Atomic Component Rules

Components in `/components/` must:

- Accept only props — no Redux `useSelector`, no RTK Query hooks, no navigation calls
- Be purely presentational or purely interactive (no API calls)
- Export a `types.ts` alongside the component for prop interfaces
- Have an `index.ts` barrel export in each category folder

Business logic belongs in hooks (`/screens/[feature]/hooks/`), not in components.

### Frontend Module Detachability Rules

A feature module is plug-and-play when:

1. **Single entry point** — only import from `index.ts` of a module
2. **Self-contained services** — inject endpoints into `emptyApi` (never create a new RTK Query API)
3. **No cross-module screen imports** — `buyer_screens` never imports from `seller_screens`; share via `/components/` or `/hooks/`
4. **Navigation is external** — the module exports screens, the stack file imports and wires them; the module doesn't own navigation logic
5. **Listed dependencies** at top of `index.ts`:

```typescript
/**
 * @module feature_screens
 * @depends components/Buttons, components/Inputs, store/emptyApi
 * @navigation requires FeatureStack registration in navigation/stack/
 */
```

To extract a module to another project: copy the `[feature]_screens/` folder, add its stack to the new app's navigation, register its RTK Query endpoints via `emptyApi.injectEndpoints`.

---

## Adding a New Module (Checklist)

### Backend

- [ ] Create `src/modules/[feature]/`
- [ ] Add `route.ts`, `controller.ts`, `types.ts`, `index.ts`
- [ ] Add schema to `src/db/schemas/[feature]Schema.ts`
- [ ] Register router in `src/index.ts`
- [ ] Add dependency comment block in `index.ts`

### Frontend

- [ ] Create `src/screens/[feature]_screens/`
- [ ] Add `FeatureScreen.tsx`, `hooks/`, `services/`, `schema/`, `index.ts`
- [ ] Create stack: `src/navigation/stack/[feature]_stack/[Feature]Stack.tsx`
- [ ] Register stack in `AppNavigationContainer.tsx`
- [ ] Add RTK Query endpoints via `emptyApi.injectEndpoints` (never create new base API)
- [ ] Add dependency comment block in `index.ts`

---

## Naming Conventions

| Item                     | Convention                        | Example                           |
| ------------------------ | --------------------------------- | --------------------------------- |
| Module folder (backend)  | kebab-case                        | `deep-links/`, `sell-offer/`      |
| Module folder (frontend) | snake_case with `_screens`        | `auth_screens/`, `buyer_screens/` |
| Screen component         | PascalCase                        | `Login.tsx`, `ProductDetail.tsx`  |
| Hook                     | camelCase with `use` prefix       | `useLoginValidation.ts`           |
| Redux slice              | camelCase with `Slice` suffix     | `authSlice.tsx`                   |
| Validation schema        | camelCase with `ValidationSchema` | `loginValidationSchema.ts`        |
| Backend route file       | always `route.ts`                 | `route.ts`                        |
| Backend controller       | always `controller.ts`            | `controller.ts`                   |
| Barrel export            | always `index.ts`                 | `index.ts`                        |
| TypeScript types         | always `types.ts`                 | `types.ts`                        |

---

## Tech Stack Reference

### Backend

- **Framework:** Express.js + TypeScript
- **ORM:** Drizzle ORM (PostgreSQL prod / SQLite local)
- **Validation:** drizzle-zod + Zod schemas
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Real-time:** Socket.IO
- **File uploads:** Multer + AWS S3
- **Testing:** Jest + Supertest
- **API docs:** Swagger/OpenAPI

### Frontend (React Native)

- **Framework:** React Native + Expo + TypeScript
- **State:** Redux Toolkit + Redux Persist
- **API:** RTK Query (injected into single `emptyApi` base)
- **Forms:** Formik + Yup
- **Navigation:** React Navigation (stack + bottom tab, role-based)
- **Styling:** NativeWind (TailwindCSS for React Native)
- **Animations:** React Native Reanimated
- **i18n:** i18next
- **Real-time:** Socket.IO client

### Admin Portal (React Web)

- **Framework:** React + TypeScript + Vite
- **State:** Redux Toolkit + RTK Query
- **Routing:** React Router v7
- **Styling:** TailwindCSS + Styled Components
- **Forms:** React Hook Form + Yup
