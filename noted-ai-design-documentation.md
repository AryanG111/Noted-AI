# Noted AI — Design Documentation

**Design Direction:** Light, playful, intelligent, human-centered workspace  
**Visual Character:** Google-inspired simplicity + hand-drawn doodles + modern AI product polish  
**Primary Theme:** Light mode  
**Design Principle:** The interface should feel like a calm personal workspace that happens to contain powerful AI—not like a technical AI dashboard.

---

## 1. Design Definition

### 1.1 Design Name

**Playful Cognitive Workspace**

Noted AI should combine:

- The cleanliness and approachability of modern Google products.
- The warmth of hand-drawn doodles and imperfect illustrations.
- The structure of a productivity workspace.
- The intelligence of an AI memory system.
- The visual calm required for reading, writing, and thinking.

The product should feel **friendly, lightweight, curious, and intelligent** rather than corporate, futuristic, dark, or overly technical.

### 1.2 Core Design Statement

> **Noted AI should look like a notebook designed by an AI that understands humans.**

The UI should communicate:

**Write → Remember → Connect → Understand → Act**

The user should never feel that they are operating a complicated knowledge-management system. Complexity should stay underneath the interface.

---

# 2. Visual Personality

## 2.1 Desired Feel

The interface should be:

- Light
- Clean
- Airy
- Warm
- Playful
- Intelligent
- Minimal
- Slightly imperfect
- Personal
- Modern
- Trustworthy

## 2.2 Avoid

Do NOT make the interface:

- Cyberpunk
- Neon-heavy
- Dark-mode-first
- Overly futuristic
- Filled with glowing AI effects
- Corporate enterprise-dashboard-like
- Dense with tables
- Covered in gradients
- Excessively rounded
- Full of generic robot/AI imagery
- Visually noisy

Noted AI is a **cognitive workspace**, not an AI demo.

---

# 3. Visual Language

## 3.1 Color Philosophy

Use a predominantly white/off-white canvas with subtle neutral surfaces.

Suggested palette:

| Token | Suggested Value | Purpose |
|---|---|---|
| Canvas | `#FFFFFF` | Main application background |
| Warm Canvas | `#FAF9F6` | Secondary workspace areas |
| Surface | `#F7F7F5` | Cards and panels |
| Text Primary | `#202124` | Main text |
| Text Secondary | `#5F6368` | Supporting text |
| Border | `#E5E7EB` | Subtle separation |
| Blue | `#4285F4` | Primary interactive accent |
| Green | `#34A853` | Success / completed |
| Yellow | `#FBBC04` | Reminder / attention |
| Red | `#EA4335` | Error / destructive |
| Purple | `#8B5CF6` | AI / intelligence accent |

Do not use every accent simultaneously.

The interface should remain mostly neutral, with color appearing when it communicates meaning.

---

# 4. Typography

Typography should be highly readable and friendly.

### Primary Font

Prefer:

- Inter
- Google Sans / similar humanist sans-serif if available
- System sans-serif fallback

### Hierarchy

**Display**

Large, expressive headings for major workspace states.

**Heading**

Clear section titles.

**Body**

Highly readable text for notes and AI responses.

**Metadata**

Small, muted text for dates, tags, confidence, source information, etc.

The note-reading experience should prioritize typography and whitespace over decorative UI.

---

# 5. Shapes and Components

## 5.1 Cards

Cards should be:

- Light
- Subtle
- Thinly bordered
- Moderately rounded
- Low/no shadow

Avoid excessive floating-card UI.

Use cards primarily when grouping meaningful information.

## 5.2 Buttons

Primary buttons should be simple and confident.

Examples:

- `New Note`
- `Ask Noted`
- `Save`
- `Create Reminder`

Use filled primary buttons sparingly.

Secondary actions should generally be text buttons or subtle outlined buttons.

## 5.3 Inputs

Inputs should feel like writing surfaces rather than form controls.

The primary note editor should have minimal chrome.

---

# 6. Doodle System

Doodles are a core part of the visual identity.

They should feel **hand-drawn, imperfect, lightweight, and intentional**.

## 6.1 Doodle Characteristics

Use:

- Thin hand-drawn strokes
- Simple line illustrations
- Slightly irregular geometry
- Small annotations
- Arrows
- Stars
- Circles
- Underlines
- Thought bubbles
- Tiny diagrams
- Scribbled connections

Do not use:

- Large cartoon characters
- Childish clip-art
- Excessive decorative illustrations
- Heavy black outlines
- Doodles behind important text

## 6.2 Doodle Usage

Doodles should appear around:

- Empty states
- Onboarding
- AI suggestions
- Memory concepts
- Timeline transitions
- Knowledge graph explanations
- First-use screens
- Helpful tooltips
- Success states

Example:

An empty Memory Timeline could show a small hand-drawn timeline with:

`idea → meeting → decision → follow-up`

and a handwritten annotation:

> "This is where your memories start connecting."

---

# 7. AI Visual Language

AI should not be represented by a robot head.

Instead, represent intelligence through:

- Small sparkle marks
- Connected dots
- Subtle animated lines
- Thought bubbles
- Highlighted relationships
- Context chips
- "Remembered from..." labels
- Small sparkle iconography

The AI should feel like an invisible intelligence layer operating inside the workspace.

---

# 8. Application Layout

## 8.1 Global Layout

Recommended desktop structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Noted AI                         Search     Ask Noted   User │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  Navigation  │              Main Workspace                   │
│              │                                               │
│  ✦ Home      │                                               │
│  📝 Notes    │                                               │
│  ◷ Timeline  │                                               │
│  ◎ Contacts  │                                               │
│  ✓ Tasks     │                                               │
│  ◇ Memory    │                                               │
│              │                                               │
│              │                                               │
│  + New Note  │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

The navigation should remain visually lightweight.

---

# 9. Home / Cognitive Dashboard

The home page should not resemble an analytics dashboard.

Instead, it should answer:

> **"What should I remember or care about right now?"**

Possible sections:

### Good Morning / Context

A small contextual greeting.

### Continue Thinking

Recently edited or unfinished notes.

### Remember This

Important memories surfaced by the system.

### Pending

Open commitments and tasks.

### People

Recently interacted contacts.

### Connected Thoughts

Related notes or ideas discovered by the memory system.

Example layout:

```text
Good evening, Aryan.

You have 3 things worth remembering.

┌─────────────────────────────┐
│ ✦ Follow up with Rahul      │
│ Mentioned 4 days ago        │
│                             │
│ [Create reminder]           │
└─────────────────────────────┘

Continue thinking

[ Project Idea ] [ Client Notes ] [ Research ]

Connected thoughts
○ Deployment
 ├── AWS migration
 ├── Docker notes
 └── Previous decision
```

---

# 10. Note Editor

The note editor is one of the most important screens.

It should feel extremely close to a clean writing application.

## Layout

```text
← Notes

Untitled note

Start writing...

────────────────────────────

✨ Noted understood this as:

Summary
...

People
Rahul

Tasks
□ Send proposal tomorrow

Related memories
• Previous meeting with Rahul
• Proposal discussion
```

AI-generated information should appear **after or beside the writing experience**, not interfere with writing.

---

# 11. AI Processing State

When a note is being processed, avoid technical loading messages such as:

> Running EntityExtractionPipeline...

Instead use human language:

> ✦ Remembering this...

Then:

> Got it. I found 2 people, 1 task and 3 related memories.

The product should expose intelligence without exposing implementation complexity.

---

# 12. Memory Timeline

The timeline should visually communicate that memories evolve over time.

Example:

```text
2026

│
● Aug 21
│  Meeting with Rahul
│  "Discussed the proposal..."
│
│     ↳ Task created
│
● Aug 17
│  Project discussion
│
│     ↳ Related to Rahul
│
● Aug 04
│  Initial idea
│
│     ↳ Connected to current project
```

Use subtle doodled arrows and annotations to show relationships.

The timeline is not merely chronological—it should reveal **contextual connections**.

---

# 13. Contact Memory

Contact profiles should behave like evolving memory profiles rather than traditional CRM records.

Example:

```text
Rahul Sharma

Met at Pune meetup
Runs a startup
Interested in AI automation

────────────────────────

Last interaction
4 days ago

Open commitments
□ Send proposal

Related memories
• Startup discussion
• Product architecture
• Proposal

Timeline
...
```

The interface should communicate:

> "Noted remembers what matters about this person."

---

# 14. Tasks and Commitments

Tasks should be extracted naturally from notes.

Instead of making the user manually create everything:

```text
Call Rahul tomorrow
```

Noted should identify:

```text
✓ Task detected

Call Rahul
Due tomorrow

[Keep task] [Dismiss]
```

The system should distinguish:

- Explicit tasks
- Commitments
- Dates
- Reminders
- Completed actions

---

# 15. Semantic Search

Search should feel conversational.

Search bar placeholder:

> Search your memory...

Examples:

> deployment problems

> what did Rahul say about the proposal?

> everything related to AWS migration

Search results should explain **why** a result is relevant when useful.

Example:

```text
Related memory

AWS Migration — Aug 12

Relevant because:
"deployment", "Docker", "EC2"
```

---

# 16. Ask Noted

The conversational interface should be lightweight.

Example:

```text
Ask Noted

What is pending with Rahul?

────────────────────────────

You have one unresolved commitment:

You mentioned sending Rahul the proposal
on August 17.

Related memories:
• Aug 17 — Product discussion
• Aug 12 — Proposal requirements

[Create reminder]
```

The response should expose its memory context without overwhelming the user.

---

# 17. Knowledge Graph

The graph should look like a living map of the user's memory.

Nodes:

- Notes
- People
- Tasks
- Events
- Ideas
- Decisions
- Research

Edges represent relationships.

Visual style:

- Thin lines
- Small nodes
- Soft colors
- White background
- Minimal labels
- Hover/focus interactions

Avoid the typical "AI neural network" aesthetic.

It should feel more like a **hand-drawn constellation of memories**.

---

# 18. Proactive Memory

The proactive agent is a major differentiator.

It should surface forgotten context gently.

Example:

```text
✦ Something you may have forgotten

You mentioned following up with Acme Corp
three weeks ago.

There hasn't been an update since.

[Create reminder]   [Dismiss]
```

Never make proactive suggestions feel aggressive.

The system should behave like a thoughtful assistant, not a notification machine.

---

# 19. Empty States

Empty states are one of the best places for doodles.

Example:

### No Notes

```text
        ✎
     /     \
    /       \

Your memory is empty.

Write something.
I'll start connecting the dots.

[Create your first note]
```

### No Tasks

```text
        ✓
     little wins

Nothing pending.

Enjoy the rare moment.
```

### No Contacts

```text
     ○──○
       \
        ○

People you mention will
start appearing here.
```

---

# 20. Responsive Design

The MVP is web-responsive.

### Desktop

- Persistent sidebar
- Large writing canvas
- Split-view possible for notes + AI context
- Graph visualization

### Tablet

- Collapsible sidebar
- Adaptive note/editor width
- Reduced secondary information

### Mobile Web

- Bottom navigation or compact navigation
- Full-width note editor
- AI context accessible through bottom sheet
- Timeline optimized vertically
- Graph becomes simplified or list-based

Native mobile apps are outside MVP scope.

---

# 21. Motion Design

Motion should be subtle.

Use animation for:

- AI processing
- Memory connections appearing
- Timeline transitions
- Search result expansion
- Task completion
- Graph focus
- Toasts

Avoid:

- Excessive bouncing
- Large transitions
- Constant animations
- Distracting particle effects

Suggested motion duration:

- Micro interaction: 100–150ms
- Standard transition: 200–300ms
- Larger transition: 300–450ms

---

# 22. Iconography

Use simple line icons.

Recommended visual vocabulary:

- Note → document
- Timeline → clock
- Contact → person
- Task → check
- Memory → spark / brain-like abstract mark
- Search → magnifier
- AI → sparkle
- Graph → connected nodes
- Reminder → bell

Icons should remain secondary to text.

---

# 23. Accessibility

The design must maintain:

- Strong text contrast
- Keyboard navigation
- Visible focus states
- Accessible labels
- Semantic HTML
- Screen-reader-friendly controls
- Reduced-motion support
- Comfortable font sizes

The playful visual language must never reduce usability.

---

# 24. Design Principles

## Principle 1 — Complexity underneath, simplicity above

The system may contain:

- LLMs
- embeddings
- vector databases
- extraction pipelines
- relationship graphs
- planners

The user should simply feel:

> "I wrote something, and Noted understood it."

---

## Principle 2 — Memory should feel alive

Do not treat notes as isolated documents.

Show:

- connections
- people
- tasks
- history
- decisions
- related ideas

---

## Principle 3 — AI should be calm

Do not constantly advertise AI.

AI should appear when it provides value.

---

## Principle 4 — Human writing comes first

The note editor should always feel like a writing environment.

AI should augment writing, not dominate it.

---

## Principle 5 — Context beats keywords

The interface should communicate semantic relationships and historical context.

---

## Principle 6 — Proactivity should be respectful

The system should surface forgotten commitments without becoming noisy.

---

# 25. Design System Summary

### Overall Style

**Google-inspired playful productivity UI**

### Theme

**Light-first**

### Surfaces

**White / warm off-white**

### Typography

**Clean humanist sans-serif**

### Shapes

**Soft, moderate rounding**

### Borders

**Subtle**

### Shadows

**Minimal**

### Illustrations

**Hand-drawn doodles**

### AI Representation

**Sparkles, connections, contextual highlights**

### Animation

**Subtle and purposeful**

### Layout

**Whitespace-heavy, content-first**

### Personality

**Curious + intelligent + friendly**

### Emotional Goal

The user should feel:

> **"This is my second brain, but it still feels like my notebook."**

---

# 26. One-Line Design Definition

> **Noted AI is a light, whitespace-rich, Google-inspired cognitive workspace that combines clean productivity UI with subtle hand-drawn doodles, human-centered AI interactions, and visual representations of connected memory.**

This definition should be used as the primary visual direction when implementing the frontend.
