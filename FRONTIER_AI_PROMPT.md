# MISSION BRIEF: NovaStage Homepage — Elite Modern Redesign

You are an elite Principal Design Engineer and Creative Technologist with the taste, craft, and precision of the founding design teams at **Linear**, **Vercel**, **Stripe**, and **Raycast**.

Your mission is to build the definitive, production-grade homepage for **NovaStage** (`/` route), a collaborative cloud system architecture and infrastructure canvas built on **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

---

## 1. ABSOLUTE ZERO-TOLERANCE ANTI-AI-SLOP DIRECTIVES

Every visual element, animation curve, and interaction must feel bespoke, intentional, and engineered by a human master craftsman. All generic AI-generated design clichés are strictly forbidden.

### Explicitly Forbidden (Instant Failure):
- **NO EMOJIS ANYWHERE IN THE UI.** Never use emojis in copy, buttons, badges, nodes, or card headers. Every visual symbol must be a clean, crisp vector icon—either imported from `lucide-react`, the existing `@/components/canvas/aws-icons` registry, or custom-coded SVG components.
- **NO BORDERED TEXT OR SLOPPY FRAMED LABELS.** Never wrap standalone text, labels, status words, or category tags in individual border boxes (e.g., `border border-white/20 rounded px-2 py-1 text-xs`). This is sloppy, cluttered AI styling. Text hierarchy must be established purely through typography craft: font weight, size, letter tracking (`tracking-tight`), and contrast/opacity (`text-white`, `text-slate-400`), never by framing text in borders.
- **NO colored top strips or side edge stripes on cards.** Never add a 2px/4px gradient or solid colored accent bar at the top or sides of card containers. This is the hallmark of low-effort AI bento slop.
- **NO meaningless numbers or fake corner tags.** Never put arbitrary numbers (`01`, `02`, `03`), fake version strings (`[SYS-09]`), or pretentious micro-labels in card corners.
- **NO tiny edge/corner texts.** No pseudo-technical filler labels (`A SHARED FRAME OF REFERENCE`, `SPEC_V2_FINAL`, `TOPOLOGY_BOUND`) floating arbitrarily in margins.
- **NO stacked glassmorphism.** Never nest `backdrop-filter: blur()` inside another blurred container. Stacking blurs crushes GPU performance, causes severe frame drops, and drains laptop batteries. Glassmorphism must be single-layer only.
- **NO Georgia, Times, or academic serif headings.** Typography must be sleek, modern, high-contrast sans-serif (Geist, Inter, or SF Pro).
- **NO fake mockup screenshots.** The canvas must import and render **NovaStage's actual production React canvas components**.
- **NO muddy beige paper or dirty noise textures.** No hospital-yellow tint (`#f2f0e9`) or faux-vintage static overlays.
- **NO staggered width-then-height resizing.** Transitions must resize proportionally with locked aspect ratios.

---

## 2. BRAND, THEME & DESIGN TOKENS

NovaStage supports both Dark and Light modes with uncompromising legibility and contrast, driven by the existing `ThemeProvider` and `useTheme` from `@/lib/theme-context`.

### Dark Mode (Primary & Default Experience)
- **Background**: Deep obsidian carbon (`#090d16` / `#0f141c`)
- **Card Surfaces**: Deep slate `#111622` with crisp hairline border `rgba(255, 255, 255, 0.08)`
- **Typography**: Pure white `#ffffff` for headings; `#94a3b8` (slate-400) for body and technical descriptions
- **Brand Accents**: Electric emerald `#10b981` / mint `#22c55e` and deep violet `#8b5cf6`
- **Logo Presentation**: Pure white monochrome logo (`dark:brightness-0 dark:invert`) rendered from `/images/logo.svg`

### Light Mode (Clean Architectural Alabaster)
- **Background**: Crisp alabaster `#fafafa` / `#ffffff`
- **Card Surfaces**: Pure white `#ffffff` with hairline border `rgba(0, 0, 0, 0.08)` and subtle elevation `0 2px 8px -2px rgba(0,0,0,0.05)`
- **Typography**: Deep charcoal obsidian `#0f172a` for headings; `#475569` (slate-600) for secondary copy
- **Brand Accents**: Deep forest emerald `#059669` and cobalt `#2563eb`
- **Logo Presentation**: Original full-color brand logo (`#333333`, `#386233`, `#3C2667`) from `/images/logo.svg`

### Glassmorphism Rules (Performance-First)
- **Single-Layer Only**: Glass blur (`backdrop-blur-md` with `bg-white/70` or `bg-[#0f141c]/70`) is permitted **only** on the floating navigation bar.
- **Card Surfaces**: Cards must use high-opacity solid fills (`bg-[#111622]` in dark, `bg-white` in light) paired with crisp 1px hairline borders (`border-white/10` or `border-black/10`).
- **Hardware Acceleration**: All transform properties must leverage GPU acceleration (`transform: translate3d(...)`, `will-change: transform`).

---

## 3. HERO SECTION (FULL-BLEED VIDEO & PINNED LAYERING)

### Visual Layout & Background
- **Full-Bleed Hero Video**:
  - The hero video `/videos/hero.mp4` (`public/videos/hero.mp4`) must expand to fill the entire hero viewport (`w-full h-screen object-cover`).
  - Overlay with a subtle directional gradient mask so typography maintains high contrast in both dark and light modes.
  - Video element configuration: `autoPlay`, `muted`, `loop`, `playsInline`, `priority`.
- **Hero Content Overlay**:
  - Pinned navbar with brand logo (responsive to theme), navigation links, theme toggle (`<ThemeToggle />`), and action buttons (`Log In`, `Start Designing`).
  - Headline: High-impact modern sans-serif headline communicating collaborative cloud architecture.
  - Subtitle: Clear, zero-slop explanation of NovaStage's real engineering capabilities.
  - Primary CTA (`[ Start Designing → ]`) and Secondary Action (`[ View Live Systems ]`).

---

## 4. SIGNATURE TRANSITION: INERTIAL HERO-TO-CANVAS SCROLL CHOREOGRAPHY (~2.5s)

This is the centerpiece interaction of the homepage.

```
[ Hero Viewport (Pinned Fixed) ]
             ▲
             │ (Tiny scroll triggers 2.5s sequence)
             │
┌───────────────────────────────┐
│ 1. Canvas Slides Up (Curtain) │ ➔ Covers 100vw x 100vh over Hero
├───────────────────────────────┤
│ 2. Background Revealer        │ ➔ WhatsApp-Style SVG Doodle Canvas reveals underneath
├───────────────────────────────┤
│ 3. Proportional Shrink        │ ➔ Canvas uniformly shrinks down into framed stage
├───────────────────────────────┤
│ 4. Assembly Animation         │ ➔ Nodes snap into place, edges draw, cursors glide
└───────────────────────────────┘
```

### Choreography Execution Details:
1. **Scroll Trigger & Autonomous Execution (Forward)**:
   - When the visitor is on the hero and scrolls down just a tiny delta (e.g. slight wheel nudge or touch drag), the forward transition engages.
   - **Full Interaction Lock**: The website immediately locks scrolling and interaction (`pointer-events-none` on interactive elements, document scroll disabled).
   - **Autonomous Progress**: The 2.5-second sequence runs completely on its own from 0% to 100% without requiring continuous scrolling. It does NOT pause, reverse, or stutter if the user scrolls up, scrolls down, or stops scrolling. User scroll inputs are discarded during this window.
   - **Unlock**: The website remains fixed and non-interactable until the final frame finishes, at which point page interactivity and normal downward scrolling unlock.
2. **Hero Stays Still (Pinned)**:
   - The hero page does not scroll away. It remains fixed in place.
   - The canvas stage slides up **on top of the hero** like a rising architectural curtain until it occupies 100% of the viewport (`100vw`, `100vh`).
3. **Background Reveal**:
   - The moment the canvas reaches full screen, the underlying page background activates with the custom **WhatsApp-style SVG doodle pattern**.
   - The rest of the page is NOT stacked on top of the hero; the canvas transitions the user cleanly from the hero video environment to the system architecture canvas environment.
4. **Proportional Smooth Resizing**:
   - Once full-screen, the canvas window smoothly and uniformly scales down into a framed container (`scale(0.88)` / `max-w-7xl`, `rounded-2xl`, crisp hairline border, ambient drop shadow).
   - **CRITICAL**: Resizing must be strictly proportional (aspect-ratio locked or uniform scaling). Never animate width and height separately.
5. **Internal Canvas Assembly**:
   - Real infrastructure nodes snap into place.
   - Curved SVG bezier connection lines connect the ports with animated data packet pulses.
   - A simulated teammate cursor (`Ayoub · Lead Architect`) glides across the canvas and leaves a live checkpoint note.
6. **Autonomous Trigger & Complete Interaction Lock (Reverse)**:
   - When the visitor scrolls back up from the features/bottom and reaches the top of the canvas stage, nudging scroll upward just a tiny delta triggers the reverse transition.
   - **Full Interaction Lock**: The website immediately locks scrolling and user inputs.
   - **Autonomous Reverse**: The animation automatically executes in reverse on its own all the way back to the beginning (canvas frame expands back to full screen, then slides down curtain-style to reveal the pinned hero video).
   - **Unlock**: Only when the reverse sequence reaches 0% and the hero is completely restored does the page unlock interactivity.
7. **Post-Choreography Sandbox**:
   - Once the forward animation finishes and unlocks, the framed canvas becomes a functional mini sandbox where visitors can pan, zoom, and drag nodes.

---

## 5. REAL PRODUCTION CANVAS INTEGRATION (NO MOCKUPS)

The homepage canvas must directly import NovaStage's actual production components:

- `CanvasViewportContainer` (`@/components/canvas/canvas-viewport`)
- `CanvasNodeComponent` (`@/components/canvas/canvas-node`)
- `CanvasEdgeLayer` (`@/components/canvas/canvas-edge-layer`)
- `CanvasDock` (`@/components/canvas/canvas-dock`)
- `CanvasCursors` (`@/components/canvas/canvas-cursors`)
- `AWS_SERVICE_REGISTRY` (`@/components/canvas/aws-icons`)

### Client-Side Mock State Machine:
- Pure client-side state (`useState` / `useReducer`) containing real cloud nodes (Next.js Edge, API Gateway, Supabase Postgres, Redis Cluster, Worker Queue).
- Zero database dependency: Runs 100% locally with 60fps performance and instant reset.

---

## 6. BESPOKE WHATSAPP-STYLE TECH DOODLE BACKGROUND

The background beneath the canvas and throughout the lower sections features a custom, hand-crafted SVG doodle pattern inspired by the WhatsApp chat background, customized for cloud engineering.

### Doodle Motif Library (Hand-Crafted SVGs):
- Server rack towers and blade chassis
- Database cylinders with relational keys
- API gateway routers and load balancer nodes
- Redis key-value cache clusters
- Terminal prompts `>_` with cursor blinks
- Git branch forks and merge commits
- Logic chips and CPU dies
- Security shield lock glyphs
- Network fiber pipes and packet nodes

### Rendering & Styling:
- **Dark Mode**: Fine stroke outlines at **3% - 4% opacity** over `#090d16`.
- **Light Mode**: Fine stroke outlines at **4% - 5% opacity** over `#fafafa`.
- Vector-rendered via a dedicated lightweight SVG pattern component that tiles smoothly without performance degradation.

---

## 7. ARCHITECTURE & CAPABILITIES: 4 INTERACTIVE BLOCKS (ZERO AI SLOP)

The section below the canvas explains what NovaStage is and does through **4 rich, interactive feature blocks**.

### Anti-Slop Strict Enforcement:
- **Zero Emojis**: Every indicator must use vector SVG icons (Lucide or custom SVG). Absolutely no emojis anywhere in cards or labels.
- **No Bordered Text**: Labels and status text must not be framed in individual borders. Use typography weight, size, and subtle color contrast instead.
- **No Colored Accent Bars**: No colored top strips, no side border strips.
- **No Arbitrary Numbers**: No meaningless corner counters (`01`, `02`, `03`) or fake spec codes.
- **Real Bespoke SVGs**: Handcrafted vector icons and diagrams for every feature block.
- **Real Engineering Data**: Live interactive state, real protocols (gRPC, HTTPS, WSS), and accurate cloud architecture metrics.

### The 4 Feature Cards:

#### 1. Live Topology & Connection Engine
- **Purpose**: Demonstrates real-time node linking, protocol auto-detection (gRPC, HTTPS, WebSocket), and port validation.
- **Interactivity**: Visitors can toggle connection protocols and watch active packet flow pulses animate along connection lines with live throughput metrics (e.g., `42.4k req/s · 4ms p99`).

#### 2. Real-Time Multiplayer Presence & Locking
- **Purpose**: Demonstrates multiplayer architecture design with active teammate cursors, node focus states, and conflict-free collaboration.
- **Interactivity**: Visitors move their mouse over the card to trigger interactive collaborative cursor reactions, dynamic cursor name tags (`Sarah · DevOps`, `Leo · Cloud Sec`), and live lock states.

#### 3. AI Infrastructure Generation & Auto-Layout
- **Purpose**: Demonstrates converting architecture prompts into production-ready system graphs.
- **Interactivity**: A tactile prompt selector with real architecture presets (*"Next.js Edge + Distributed Cache"*, *"Event-Driven Kafka Pipeline"*, *"Serverless Microservices"*). Clicking a preset instantly reconfigures the mini-topology with smooth spring layout transitions.

#### 4. System Specs & Latency Inspector
- **Purpose**: Shows real infrastructure specifications, instance sizing, availability tiers, and estimated monthly cloud costs.
- **Interactivity**: Clicking services (PostgreSQL Primary, Redis Cache, Cloudflare Worker) opens an interactive spec sheet showing memory footprints, IOPS limits, region failover routes, and live cost calculation.

---

## 8. AUTH TRANSITIONS & LOADING SCREEN SLIDE-UP

When visitors navigate to authentication pages, the application reuses the production loading screen for seamless transitions:

1. **Trigger**: Clicking **"Get Started"** (`/signup`) or **"Log In"** (`/login`) anywhere on the homepage triggers the transition controller.
2. **Mount**: Displays the existing `<LoadingScreen />` from `src/app/loading-screen.tsx`.
3. **Slide-Up Exit**: Once the destination page mounts, the loading screen executes its CSS transition `.loading-screen--exiting`:
   ```css
   .loading-screen--exiting {
     transform: translateY(-100%);
   }
   ```
   Smoothly sliding up off-screen to reveal the login or signup interface.

---

## 9. STRICT MODULAR ARCHITECTURE (NO 3,000-LINE FILES)

The implementation must be decomposed into dedicated, single-responsibility files under `src/components/home/`. No individual file should exceed 250–300 lines.

```
src/components/home/
├── home-experience.tsx                # Master coordinator and scroll stage orchestrator
├── background/
│   └── whatsapp-doodle-background.tsx # Bespoke SVG cloud architecture doodle pattern
├── navigation/
│   ├── home-navbar.tsx                # Glassmorphic header with logo, links, and ThemeToggle
│   └── auth-transition-link.tsx       # Link wrapper triggering LoadingScreen slide-up
├── hero/
│   ├── hero-section.tsx               # Pinned hero container
│   ├── hero-video.tsx                 # Full-bleed loop video player (/videos/hero.mp4)
│   └── hero-content.tsx               # Bold typography, value proposition, and CTA row
├── canvas/
│   ├── canvas-scroll-stage.tsx        # Scroll inertia controller and curtain transform
│   ├── canvas-frame-wrapper.tsx       # Proportional shrink container with perspective frame
│   ├── canvas-sandbox.tsx             # Production canvas components and local state machine
│   └── canvas-assembly-animation.tsx  # Coordinated node snap-in, bezier draw, and cursor glide
├── features/
│   ├── features-section.tsx           # Architecture feature grid orchestrator
│   └── cards/
│       ├── card-topology-engine.tsx   # Card 1: Protocol switching & packet pulse
│       ├── card-multiplayer.tsx       # Card 2: Simulated team presence & live cursors
│       ├── card-ai-generator.tsx      # Card 3: Preset prompt-to-graph synthesis
│       └── card-specs-inspector.tsx   # Card 4: Service telemetry & cost inspector
└── footer/
    └── home-footer.tsx                # Clean technical footer with legal modals & status
```

---

## 10. VERIFICATION & QUALITY CRITERIA

1. **Performance**: Zero stacked blurs; 60fps scrolling on standard laptops; zero layout shift.
2. **Theming**: Flawless switching between Dark and Light modes. Dark mode features the inverted pure white logo; Light mode features the full-color brand logo.
3. **Scroll Physics & Autonomous Lock**: 2.5-second autonomous animation in both directions (forward and reverse). Complete interaction and scroll locking during the transition; user cannot interrupt or stutter it by scrolling up or down; strictly proportional aspect-ratio locked canvas resizing.
4. **Authenticity**: Real AWS/cloud node components from `@/components/canvas/`; zero fake screenshot images.
5. **Anti-Slop Validation**: Zero emojis across the entire UI (all symbols must be imported Lucide or custom SVG icons); zero bordered text or framed labels; zero colored card edge strips; zero meaningless `[01]` numbers; zero serif headings.
