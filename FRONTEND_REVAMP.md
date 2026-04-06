# Frontend Revamp — Grid Control Design Direction

## Vision

Transform TestFlow from a functional flat-UI tool into a **stunning industrial control room experience**. The design language draws from real substation control rooms: dark backgrounds, precision readouts, glowing status indicators, and immersive 3D depth. Think less "generic SaaS" and more "mission-critical grid operations center with cinematic visuals."

Three phases, each delivering visible improvement on its own:
- **Phase 1** — Dark theme + motion + CSS depth (2D, no new heavy deps)
- **Phase 2** — SVG schematic equipment cards (2D, zero runtime cost)
- **Phase 3** — 3D models, interactive scenes, cinematic dashboards (WebGL via React Three Fiber)

---

## Design Language: "Grid Control"

### Core Principles

| Principle | What it means in practice |
|---|---|
| **Depth over flatness** | Layered surfaces, shadows, glass panels — not flat white cards |
| **Information density** | Data stays readable; design enhances, never obscures |
| **Industrial precision** | Monospace numbers, tight grids, status glows — feel like instruments |
| **Dark-first with toggle** | Dark mode is primary; light mode is available via a toggle button |
| **Motion with purpose** | Animations communicate state changes, not decoration |

### Color Palette

```
Background      #0a0e17   Near-black with cold blue tint
Surface         #0f1520   Card/panel background
Surface raised  #141c2e   Elevated cards
Border          #1e2d45   Subtle dividers
Border glow     #2563eb40 Active/hover state glow

Primary blue    #3b82f6   Interactive elements, links
Electric blue   #60a5fa   Highlights, active states
Amber           #f59e0b   Active projects, warnings
Green           #10b981   Approved, completed, healthy
Red             #ef4444   Rework, critical, error
Muted text      #64748b   Labels, secondary info
Body text       #cbd5e1   Primary readable text
Bright text     #f1f5f9   Headings, key data
```

### Light Mode Palette (dark theme toggle off)

```
Background      #f8fafc
Surface         #ffffff
Surface raised  #f1f5f9
Border          #e2e8f0
Primary blue    #2563eb
Text muted      #64748b
Text body       #334155
Text bright     #0f172a
```

### Typography

```
Headings     Inter or Geist (weight 700–800, tight tracking)
Body         Inter (weight 400–500)
Numbers/data JetBrains Mono or Geist Mono (instrument-panel feel)
```

### Glow System

A key atmospheric element — components that are active/selected emit a soft color glow (dark mode only):

```css
/* Active card */
box-shadow: 0 0 0 1px #3b82f640, 0 0 24px #3b82f620;

/* Success state */
box-shadow: 0 0 0 1px #10b98140, 0 0 16px #10b98115;

/* Warning/active project */
box-shadow: 0 0 0 1px #f59e0b40, 0 0 20px #f59e0b15;
```

---

## Tech Stack Additions

```bash
# Phase 1 — Animation and transitions
npm install framer-motion

# Phase 3 — 3D scene rendering
npm install three @react-three/fiber @react-three/drei @react-spring/three
npm install --save-dev @types/three
```

| Package | Purpose | Phase |
|---|---|---|
| `framer-motion` | Page transitions, hover animations, counters | 1 |
| `three` | Core WebGL renderer | 3 |
| `@react-three/fiber` | React bindings for Three.js | 3 |
| `@react-three/drei` | Camera, environment, orbit controls, Float, Text helpers | 3 |
| `@react-spring/three` | Physics-based animation for 3D objects | 3 |

---

## Phase 1 — Dark Theme + Motion + CSS Depth
**Goal:** Ship a dramatically better-looking app with minimal risk. Pure CSS/Tailwind — no new heavy dependencies beyond framer-motion.

### 1.1 Dark Theme Toggle

A `ThemeProvider` context stores the active theme (`'dark' | 'light'`) in `localStorage`. A toggle button in the sidebar/header switches between modes.

```tsx
// src/contexts/ThemeContext.tsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

Toggle button placed in the sidebar footer or header right-side:

```tsx
// Sun/Moon icon swap
import { Sun, Moon } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} className="p-2 rounded-lg hover:bg-surface-raised transition-colors">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

### 1.2 New Tailwind Theme (`tailwind.config.ts`)

Replace the default shadcn theme with the Grid Control palette. Use CSS variables so dark/light toggle works with Tailwind's `dark:` variants:

```ts
colors: {
  background:  'var(--bg)',
  surface:     'var(--surface)',
  'surface-raised': 'var(--surface-raised)',
  border:      'var(--border)',
  primary: {
    DEFAULT: '#3b82f6',
    hover:   '#60a5fa',
  },
  amber:       '#f59e0b',
  green:       '#10b981',
  red:         '#ef4444',
  'text-muted': 'var(--text-muted)',
  'text-body':  'var(--text-body)',
  'text-bright':'var(--text-bright)',
}
```

```css
/* src/styles/theme.css */
:root {
  --bg:             #f8fafc;
  --surface:        #ffffff;
  --surface-raised: #f1f5f9;
  --border:         #e2e8f0;
  --text-muted:     #64748b;
  --text-body:      #334155;
  --text-bright:    #0f172a;
}

.dark {
  --bg:             #0a0e17;
  --surface:        #0f1520;
  --surface-raised: #141c2e;
  --border:         #1e2d45;
  --text-muted:     #64748b;
  --text-body:      #cbd5e1;
  --text-bright:    #f1f5f9;
}
```

### 1.3 DashboardLayout Revamp

New layout features:
- Fixed dark sidebar (not top-only header)
- Role-specific sidebar with icon navigation
- `ThemeToggle` button in sidebar footer
- Frosted glass header bar
- Subtle animated background grid pattern (CSS only)

```
┌─────────────┬───────────────────────────────┐
│  T E S T    │  [page title]      [user] [🌙]│
│  F L O W   ─┤─────────────────────────────── │
│             │                               │
│  ⚡ Overview │      main content area        │
│  📁 Projects│                               │
│  ✓  Tests   │                               │
│  👤 Team    │                               │
│             │                               │
│        [🌙] │                               │
└─────────────┴───────────────────────────────┘
```

### 1.4 Hover Cards (CSS + Framer Motion)

Replace flat shadcn `<Card>` with a `<HoverCard>` component using CSS transforms — no 3D perspective:

```tsx
// src/components/HoverCard.tsx
import { motion } from 'framer-motion';

export function HoverCard({ children, glowColor = '#3b82f6' }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        '--glow-color': glowColor,
      } as React.CSSProperties}
      className="hover:shadow-glow transition-shadow"
    >
      {children}
    </motion.div>
  );
}
```

### 1.5 Page Transitions

Wrap page content in a `<PageTransition>` component using Framer Motion `AnimatePresence`:

```tsx
// Slide in from right with fade — feels like navigating a real system
const variants = {
  initial:  { opacity: 0, x: 20, filter: 'blur(4px)' },
  animate:  { opacity: 1, x: 0,  filter: 'blur(0px)' },
  exit:     { opacity: 0, x: -20 },
};
```

### 1.6 Status Badge Glow

Current `StatusBadge` uses plain color. New version uses the glow system (dark mode) and clean solid borders (light mode):

| Status | Color | Dark glow |
|---|---|---|
| DRAFT | blue muted | none |
| APPROVED | blue bright | electric blue glow |
| ACTIVE | amber | amber pulse animation |
| CLOSED | grey | none |
| SUBMITTED | purple | purple glow |
| REWORK | red | red pulse animation |

### 1.7 Stat Cards with Live Counters

The dashboard stat cards (Total / Active / Closed) get:
- Animated number counter on mount (`useMotionValue` + spring)
- Colored top border matching the stat type
- Subtle shimmer animation when data refreshes

---

## Phase 2 — Equipment Visual Cards
**Goal:** Replace generic equipment type icons with visually distinct SVG icon cards. Engineers and supervisors get clear, recognizable equipment representations without WebGL overhead.

### Equipment Icon Cards

Each equipment type gets a unique SVG illustration (schematic-style, like a one-line diagram symbol). These are crisp at any size and render instantly.

| Equipment | SVG Symbol | Style |
|---|---|---|
| Power Transformer | Two circles with connecting lines (IEEE symbol) | Stroke, blue tint |
| Current Transformer | Circle with through-line | Stroke, neutral |
| CVT | Stacked capacitor + VT symbol | Stroke, teal |
| SF6 Breaker | Rectangle with cross (open/closed state) | Stroke, amber |
| Isolator | Two-blade switch symbol | Stroke, grey |
| VCB | Circle with contact dots | Stroke, neutral |
| Lightning Arrestor | Zigzag arrow to ground | Stroke, red tint |
| Earth Pit | Ground symbol (three lines) | Stroke, green |

### Equipment Card Component

```
┌───────────────────────────────┐
│   [SVG schematic symbol]      │  ← 80×80 SVG icon, colored by status
│                               │
├───────────────────────────────┤
│  PTR-001  ·  Power Transformer│
│  ████████░░  8/10 tests done  │
│  ● IN_PROGRESS                │
└───────────────────────────────┘
```

Click → navigates to the equipment's test list.
Hover → card lifts with `HoverCard` spring animation.

### Status-driven Icon Color

```tsx
const statusColors = {
  completed:    '#10b981',   // green
  in_progress:  '#3b82f6',   // blue
  has_rework:   '#ef4444',   // red
  not_started:  '#64748b',   // muted
};
```

---

## Phase 3 — Cinematic 3D Experience
**Goal:** Replace SVG icons with interactive low-poly 3D models. Dashboards get immersive 3D scenes. Engineers and supervisors feel like they're inside a real substation control room.

### 3.1 Equipment 3D Models

One React Three Fiber component per equipment type. Models are **low-poly** (< 2k triangles each) — instantly recognizable, no loading screen needed. Built from Three.js primitives — no external `.gltf` files.

| Equipment | 3D Representation | Signature Detail |
|---|---|---|
| Power Transformer | Rectangular steel tank + HV bushings on top | 3 gold cylinder bushings |
| Current Transformer | Upright cylinder with terminal cap | Porcelain insulator rings |
| CVT | Stacked capacitor bank + transformer head | Tapered stack silhouette |
| SF6 Breaker | Triple upright cylinder cluster (3 phases) | Metallic chrome finish |
| Isolator | Two-blade arm on insulator post | Open/close blade animation |
| VCB | Rectangular panel with circular face | Door open on hover |
| Lightning Arrestor | Tall stack of disc insulators | Zigzag glow on hover |
| Earth Pit | Ground surface with copper rod driving down | Depth pulse animation |

### 3.2 Equipment Card with 3D Canvas

```
┌───────────────────────────────┐
│  [React Three Fiber Canvas]   │  ← 180px height, auto-rotating model
│   low-poly 3D model, lit      │    physics float animation
│   status glow point light     │
├───────────────────────────────┤
│  PTR-001  ·  Power Transformer│
│  ████████░░  8/10 tests done  │
│  ● IN_PROGRESS                │
└───────────────────────────────┘
```

Click → navigates to equipment test list.
Hover → model tilts toward cursor.
Completed (100%) → soft green particle halo.
Has rework → slow red pulse on point light.

### 3.3 Procedural Geometry (No external assets)

```tsx
// Power Transformer: steel tank + 3 HV bushings
function PowerTransformerMesh() {
  return (
    <group>
      {/* Main tank */}
      <mesh>
        <boxGeometry args={[1.2, 0.8, 0.9]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* HV Bushings */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.65, 0.2]}>
          <cylinderGeometry args={[0.06, 0.1, 0.5, 8]} />
          <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
```

### 3.4 Scene Setup (per equipment card)

```tsx
// src/components/equipment/EquipmentModel3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';

export function EquipmentModel3D({ type, status }: { type: EquipmentType; status: string }) {
  const glowColor = status === 'APPROVED' ? '#10b981' : status === 'REWORK' ? '#ef4444' : '#3b82f6';
  return (
    <Canvas camera={{ position: [3, 2, 3], fov: 40 }}>
      <Environment preset="city" />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} color={glowColor} intensity={1.5} />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <EquipmentMesh type={type} />
      </Float>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
    </Canvas>
  );
}
```

---

### 3.5 GM Dashboard — Substation Network Graph

A 3D node graph giving an at-a-glance overview of all projects and their supervisors:

- Each **node** = one project (sphere; size = scope complexity)
- **Color** = status: amber=ACTIVE, blue=APPROVED, grey=DRAFT, green=CLOSED
- **Lines** connecting project node → assigned supervisor node
- Camera auto-rotates slowly; user can grab and orbit
- Clicking a node navigates to the project

```tsx
// ProjectNode: sphere + floating text label + status glow ring
// Edge: Line2 from @react-three/drei connecting project → supervisor
// Scene: clusters if > 20 nodes (force-directed layout)
```

```
          [ACTIVE project]
         ●  amber glow
        /|\
       / | \
      /  |  \
[CLOSED] |  [DRAFT]
green    |  grey
     [supervisor]
      white node
```

---

### 3.6 Supervisor Dashboard — Equipment Rack View

A 3D grid of all equipment instances across assigned projects — like a real rack in a control room:

- Rows = projects, columns = equipment instances
- Status encoded in emissive material color
- Hover → floating tooltip: label, completion %, last updated
- Click → navigate to equipment detail

```tsx
// EquipmentRackScene: instanced mesh grid (performant even with 100+ items)
// StatusMaterial: emissive color changes based on task completion
// HoverTooltip: Html component from drei, floats above hovered item
```

---

### 3.7 Engineer Dashboard — Task Stack

A 3D stack of test task "cards" floating in 3D space:

- Cards are 3D planes with task info on the face
- Sorted by urgency: closer to camera = more urgent
- Completed tasks fall away with physics animation (`@react-spring/three`)
- REWORK tasks: red edge glow + subtle shake on mount
- IN_PROGRESS: pulsing blue point light

---

### 3.8 Auth Page — Electric Arc Background

Full-screen Three.js particle field simulating electric arcs and voltage:

```tsx
// ParticleField: 2000 Points geometry with shader material
// Arc lines: randomly generated CatmullRomCurve3 paths with fade-in/out
// All animated on GPU — zero CPU cost at runtime
// Fallback: CSS radial gradient if WebGL not available
```

---

### 3.9 Performance Guardrails

Three.js is ~600 KB gzipped. Mitigate:

```ts
// vite.config.ts — split Three.js into its own chunk
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'three': ['three'],
        'r3f':   ['@react-three/fiber', '@react-three/drei'],
      }
    }
  }
}
```

```tsx
// Lazy-load all 3D scenes — only load Three.js when component is mounted
const EquipmentModel3D = lazy(() => import('./equipment/EquipmentModel3D'));
const NetworkGraph = lazy(() => import('../scenes/NetworkGraph'));

// WebGL availability check
const canUseWebGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch { return false; }
})();

// Fallback: 2D SVG version for low-powered devices or no WebGL
```

---

## Component Architecture Changes

### New components to create

```
frontend/src/
├── contexts/
│   └── ThemeContext.tsx            ← Phase 1: Dark/light toggle + localStorage
├── components/
│   ├── ThemeToggle.tsx             ← Phase 1: Sun/Moon button
│   ├── HoverCard.tsx               ← Phase 1: Framer Motion lift card
│   ├── PageTransition.tsx          ← Phase 1: Animated route wrapper
│   ├── GlowBadge.tsx               ← Phase 1: Status badge with glow
│   ├── AnimatedCounter.tsx         ← Phase 1: Spring number counter
│   ├── Sidebar.tsx                 ← Phase 1: Fixed dark sidebar
│   └── equipment/
│       ├── EquipmentIcon.tsx       ← Phase 2: SVG schematic symbol
│       ├── EquipmentCard.tsx       ← Phase 2: SVG icon + data card
│       ├── EquipmentModel3D.tsx    ← Phase 3: R3F canvas wrapper
│       ├── EquipmentCard3D.tsx     ← Phase 3: 3D model + data card
│       └── meshes/                 ← Phase 3: Procedural geometry per type
│           ├── PowerTransformer.tsx
│           ├── CurrentTransformer.tsx
│           ├── CVT.tsx
│           ├── SF6Breaker.tsx
│           ├── Isolator.tsx
│           ├── VCB.tsx
│           ├── LightningArrestor.tsx
│           └── EarthPit.tsx
├── scenes/                         ← Phase 3: Dashboard 3D scenes
│   ├── NetworkGraph.tsx            ← GM project node graph
│   ├── EquipmentRack.tsx           ← Supervisor equipment grid
│   ├── TaskStack.tsx               ← Engineer floating task cards
│   └── ParticleField.tsx           ← Auth page electric arc background
└── styles/
    └── theme.css                   ← CSS variables for Grid Control palette
```

### Components to revamp (not replace)

| Component | Change |
|---|---|
| `DashboardLayout` | Add sidebar, dark bg, frosted header, `ThemeToggle` |
| `StatusBadge` | Add glow animations |
| `ProjectDetail` tabs | Animate tab content transitions |
| `NewProject` wizard | Step indicator with smooth CSS transitions |
| `ProjectStatusActions` | Status pill with animated transition |
| Auth page | Full-screen dark background + animated Zap logo |

---

## Page-by-Page Revamp Map

### Auth Page
- **Phase 1**: Animated subtle grid/dot background (CSS only), glass login card, animated Zap icon
- **Phase 3**: Full-screen Three.js electric arc particle field behind the login card

### GM Dashboard
- **Phase 1**: Dark sidebar, stat cards with counters, project list with hover cards, `ThemeToggle`
- **Phase 2**: Equipment type icons → SVG schematic symbols in project summary
- **Phase 3**: 3D network graph hero scene — project nodes connected to supervisor nodes, color-coded by status

### Supervisor Dashboard
- **Phase 1**: Project cards with status glow, lift on hover
- **Phase 2**: Equipment instances as SVG icon cards
- **Phase 3**: 3D equipment rack — instanced mesh grid of all assigned equipment; hover for tooltips

### Engineer Dashboard
- **Phase 1**: Task table with animated row entries
- **Phase 2**: Task cards with SVG test type icons
- **Phase 3**: 3D floating task stack — cards sorted by urgency, completed ones fall away with physics

### Project Detail
- **Phase 1**: Tab transitions with slide animation
- **Phase 2**: Equipment tab cards show SVG schematic symbol per instance
- **Phase 3**: Equipment tab cards show full 3D rotating model; auto-rotates on hover

### NewProject Wizard
- **Phase 1**: Animated step indicator with smooth transitions
- **Phase 2**: Equipment scope selection shows SVG previews of each type being added
- **Phase 3**: Equipment scope selection shows mini 3D preview of each type

---

## Implementation Order (Recommended)

```
Week 1  ── Phase 1a: CSS variables, tailwind theme, ThemeContext + ThemeToggle
Week 2  ── Phase 1b: dark layout, sidebar, DashboardLayout revamp
Week 3  ── Phase 1c: HoverCard, PageTransition, GlowBadge, AnimatedCounter
Week 4  ── Phase 1d: Auth page revamp, framer-motion page transitions

Week 5  ── Phase 2a: SVG schematic symbols for all 8 equipment types
Week 6  ── Phase 2b: EquipmentCard component, wire into ProjectDetail equipment tab

Week 7  ── Phase 3a: R3F setup, vite chunk split, WebGL availability check
           ── PowerTransformer mesh + EquipmentModel3D canvas wrapper
Week 8  ── Phase 3b: All 8 equipment meshes + EquipmentCard3D
Week 9  ── Phase 3c: Wire EquipmentCard3D into ProjectDetail equipment tab
           ── Auth page ParticleField background
Week 10 ── Phase 3d: NetworkGraph scene for GM dashboard
Week 11 ── Phase 3e: EquipmentRack scene for Supervisor dashboard
Week 12 ── Phase 3f: TaskStack scene for Engineer dashboard + polish
```

---

## Bundle Size

| Phase | New deps | Gzipped weight | Load strategy |
|---|---|---|---|
| Phase 1 | `framer-motion` | ~100 KB | Always loaded |
| Phase 2 | none | 0 KB | Inline SVG |
| Phase 3 | `three` + `@react-three/fiber` + `@react-three/drei` | ~620 KB | Lazy-loaded only when 3D scene is in view |

```bash
# Phase 1
npm install framer-motion

# Phase 3
npm install three @react-three/fiber @react-three/drei @react-spring/three
npm install --save-dev @types/three
```

**Phase 3 load strategy:**
```ts
// vite.config.ts — split Three.js into its own chunk
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'three': ['three'],
        'r3f':   ['@react-three/fiber', '@react-three/drei'],
      }
    }
  }
}
```

```tsx
// Lazy-load all 3D scenes
const EquipmentModel3D = lazy(() => import('./equipment/EquipmentModel3D'));
const NetworkGraph = lazy(() => import('../scenes/NetworkGraph'));

// Wrap in Suspense with skeleton fallback
<Suspense fallback={<EquipmentCardSkeleton />}>
  <EquipmentModel3D type={type} status={status} />
</Suspense>

// WebGL check — fallback to SVG card if unavailable
const canUseWebGL = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2'); }
  catch { return false; }
})();
```

---

## Reference Aesthetics

| Reference | What to borrow |
|---|---|
| Linear (linear.app) | Sidebar depth, dark surface layering |
| Vercel Dashboard | Stat card style, typography density |
| Stripe Radar | Data density on dark background |
| GitHub Copilot UI | Glow effects, code-adjacent aesthetic |
| SCADA / EMS software | Status indicator patterns, grid metaphors, SVG schematic symbols |
| NASA GSFC control rooms | Phase 3 — instrument panel feel, dark+glow aesthetic |
| Spline.design showcases | Phase 3 — low-poly 3D style reference for equipment models |
| Buildkite Pipelines | Phase 3 — node graph layout reference for NetworkGraph |

---

## Phase 1 Starter — Exact File Changes

To begin Phase 1 immediately, these are the exact files to touch:

1. `frontend/src/styles/theme.css` — **new file**: CSS variables for dark + light
2. `frontend/tailwind.config.ts` — swap color palette to use CSS variables
3. `frontend/src/index.css` — import theme.css, add grid background pattern
4. `frontend/src/contexts/ThemeContext.tsx` — **new file**: theme toggle context
5. `frontend/src/components/ThemeToggle.tsx` — **new file**: Sun/Moon button
6. `frontend/src/components/DashboardLayout.tsx` — sidebar + dark bg + ThemeToggle
7. `frontend/src/components/StatusBadge.tsx` — add glow classes
8. `frontend/src/components/HoverCard.tsx` — **new file**
9. `frontend/src/components/PageTransition.tsx` — **new file**
10. `frontend/src/App.tsx` — wrap routes in `AnimatePresence`, add `ThemeProvider`
11. `frontend/src/pages/Auth.tsx` — dark redesign
12. `frontend/package.json` — add `framer-motion`

Start with `npm install framer-motion`, the CSS variable theme, and the `ThemeToggle` — that alone will transform the look and give users control over their preferred mode.
