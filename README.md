# Client Portal

A multi-role client workspace built as a realistic admin/portal foundation — the kind of structure a small SaaS
actually ships with, rather than a single-screen demo. Authentication, protected routing, and a UI that changes
shape depending on who is logged in.

Frontend single-page app (React + TypeScript + Vite); the API layer is mocked with
[MSW](https://mswjs.io) so the whole thing runs standalone.

## What's in it

- **Role-based access control** with [CASL](https://casl.js.org) (`@casl/ability` + `@casl/react`) — abilities
  are defined per role and the UI reacts to them, so a user never sees an action they can't perform
- **Authentication flow** with protected routes
- **Dashboards** on MUI X charts and ApexCharts
- **Data tables** on TanStack Table
- **Drag-and-drop boards** via dnd-kit and @hello-pangea/dnd
- **Rich-text editing** with TipTap
- **Forms** with Formik + Yup validation
- **Internationalization** with i18next
- Redux Toolkit for state, React Router for navigation

## Stack

React · TypeScript · Vite · Redux Toolkit · MUI v6 + MUI X · TanStack Table · CASL · TipTap · dnd-kit ·
ApexCharts · Formik + Yup · i18next · MSW

## Running it

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build
```

## Structure

```
src/
  views/         feature screens — dashboard, tables, charts, forms, apps
  components/    shared UI components
  routes/        Router.tsx and route definitions
  context/       app-level providers (incl. CASL ability)
  layouts/       page shells
  mocks/         MSW request handlers
  theme/         MUI theme
```
