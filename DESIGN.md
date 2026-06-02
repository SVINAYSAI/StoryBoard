---

version: alpha
name: StoryBoard
description: An inspired interpretation of a workflow-first AI creator product — a newsroom-to-video studio that turns live news into research, scripts, voiceovers, visuals, and editable videos. The surface language stays Vercel-like in its clarity: near-white canvas, deep ink text, hairline borders, restrained shadows, geometric sans typography, and monospaced technical labels. The difference is in the workflow: this system is built for production, not marketing.

colors:
primary: "#111827"
on-primary: "#ffffff"
ink: "#111827"
body: "#4b5563"
mute: "#9ca3af"
hairline: "#e5e7eb"
hairline-strong: "#cbd5e1"
canvas: "#ffffff"
canvas-soft: "#f8fafc"
canvas-soft-2: "#f1f5f9"
canvas-elevated: "#ffffff"
link: "#4f46e5"
link-deep: "#4338ca"
success: "#16a34a"
success-soft: "#dcfce7"
success-deep: "#15803d"
error: "#dc2626"
error-soft: "#fee2e2"
error-deep: "#b91c1c"
warning: "#d97706"
warning-soft: "#fef3c7"
warning-deep: "#b45309"
info: "#0ea5e9"
info-soft: "#e0f2fe"
info-deep: "#0284c7"
violet: "#7c3aed"
violet-soft: "#ede9fe"
violet-deep: "#5b21b6"
cyan: "#06b6d4"
cyan-soft: "#cffafe"
cyan-deep: "#0e7490"
magenta: "#db2777"
magenta-soft: "#fce7f3"
magenta-deep: "#be185d"
amber: "#f59e0b"
amber-soft: "#fef3c7"
amber-deep: "#b45309"
selection-bg: "#111827"
selection-fg: "#f9fafb"
gradient-news-start: "#0ea5e9"
gradient-news-end: "#4f46e5"
gradient-script-start: "#7c3aed"
gradient-script-end: "#db2777"
gradient-voice-start: "#06b6d4"
gradient-voice-end: "#14b8a6"
gradient-video-start: "#f59e0b"
gradient-video-end: "#ef4444"

typography:
display-xl:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 48px
fontWeight: 600
lineHeight: 1.05
letterSpacing: -2px
display-lg:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 32px
fontWeight: 600
lineHeight: 1.15
letterSpacing: -1.2px
display-md:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 24px
fontWeight: 600
lineHeight: 1.2
letterSpacing: -0.8px
display-sm:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 20px
fontWeight: 600
lineHeight: 1.3
letterSpacing: -0.5px
body-lg:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 18px
fontWeight: 400
lineHeight: 1.7
body-md:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 16px
fontWeight: 400
lineHeight: 1.6
body-md-strong:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 16px
fontWeight: 500
lineHeight: 1.6
body-sm:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 14px
fontWeight: 400
lineHeight: 1.5
body-sm-strong:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 14px
fontWeight: 500
lineHeight: 1.5
caption:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 12px
fontWeight: 400
lineHeight: 1.4
caption-mono:
fontFamily: Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace
fontSize: 12px
fontWeight: 400
lineHeight: 1.4
code:
fontFamily: Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace
fontSize: 13px
fontWeight: 400
lineHeight: 1.55
button-md:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 14px
fontWeight: 500
lineHeight: 1.4
button-lg:
fontFamily: Geist, Inter, system-ui, -apple-system, sans-serif
fontSize: 16px
fontWeight: 500
lineHeight: 1.4

rounded:
none: 0px
xs: 4px
sm: 6px
md: 8px
lg: 12px
xl: 16px
pill-sm: 999px
pill: 999px
full: 9999px

spacing:
xxs: 4px
xs: 8px
sm: 12px
md: 16px
lg: 24px
xl: 32px
2xl: 40px
3xl: 48px
4xl: 64px
5xl: 96px
6xl: 128px
section: 160px

components:
app-shell:
backgroundColor: "{colors.canvas-soft}"
textColor: "{colors.ink}"
typography: "{typography.body-md}"
sidebar:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
width: 280px
collapsedWidth: 88px
top-bar:
backgroundColor: "rgba(255,255,255,0.9)"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
height: 68px
blur: 16px
context-panel:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
workspace-panel:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.xl}"
card-base:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
shadow: "0px 1px 2px rgba(15, 23, 42, 0.04)"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
card-soft:
backgroundColor: "{colors.canvas-soft}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
card-emphasis:
backgroundColor: "{colors.primary}"
textColor: "{colors.on-primary}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
button-primary:
backgroundColor: "{colors.primary}"
textColor: "{colors.on-primary}"
typography: "{typography.button-lg}"
rounded: "{rounded.pill}"
padding: "0px {spacing.lg}"
height: 44px
button-secondary:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
typography: "{typography.button-lg}"
rounded: "{rounded.pill}"
padding: "0px {spacing.lg}"
height: 44px
button-primary-sm:
backgroundColor: "{colors.primary}"
textColor: "{colors.on-primary}"
typography: "{typography.button-md}"
rounded: "{rounded.pill-sm}"
padding: "0px {spacing.md}"
height: 36px
button-secondary-sm:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
typography: "{typography.button-md}"
rounded: "{rounded.pill-sm}"
padding: "0px {spacing.md}"
height: 36px
tab-pill:
backgroundColor: "{colors.canvas}"
textColor: "{colors.body}"
typography: "{typography.body-sm}"
rounded: "{rounded.pill-sm}"
padding: "0px {spacing.md}"
height: 34px
icon-button-circular:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
rounded: "{rounded.full}"
form-input:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
typography: "{typography.body-sm}"
rounded: "{rounded.sm}"
padding: "0px {spacing.md}"
height: 44px
form-input-lg:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
typography: "{typography.body-md}"
rounded: "{rounded.sm}"
padding: "0px {spacing.md}"
height: 52px
badge-secondary:
backgroundColor: "{colors.canvas-soft-2}"
textColor: "{colors.body}"
typography: "{typography.caption}"
rounded: "{rounded.full}"
padding: "0px {spacing.sm}"
badge-status-success:
backgroundColor: "{colors.success-soft}"
textColor: "{colors.success-deep}"
typography: "{typography.caption}"
rounded: "{rounded.full}"
padding: "0px {spacing.sm}"
badge-status-warning:
backgroundColor: "{colors.warning-soft}"
textColor: "{colors.warning-deep}"
typography: "{typography.caption}"
rounded: "{rounded.full}"
padding: "0px {spacing.sm}"
badge-status-error:
backgroundColor: "{colors.error-soft}"
textColor: "{colors.error-deep}"
typography: "{typography.caption}"
rounded: "{rounded.full}"
padding: "0px {spacing.sm}"
search-result-card:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
script-editor-shell:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.xl}"
voice-card:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
visual-scene-card:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
timeline-shell:
backgroundColor: "#0f172a"
textColor: "#ffffff"
borderColor: "#1e293b"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
timeline-track:
backgroundColor: "#111827"
textColor: "#ffffff"
radius: "{rounded.sm}"
timeline-chip:
backgroundColor: "#1f2937"
textColor: "#e5e7eb"
typography: "{typography.caption-mono}"
rounded: "{rounded.sm}"
padding: "0px {spacing.sm}"
waveform-panel:
backgroundColor: "{colors.canvas-soft}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
preview-stage:
backgroundColor: "#0b1120"
textColor: "#ffffff"
radius: "{rounded.lg}"
padding: "{spacing.lg}"
media-grid-item:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.md}"
empty-state-card:
backgroundColor: "{colors.canvas-soft}"
textColor: "{colors.body}"
radius: "{rounded.lg}"
padding: "{spacing.xl}"
toast:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.md}"
modal-card:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
borderColor: "{colors.hairline}"
radius: "{rounded.lg}"
padding: "{spacing.xl}"

---

## Overview

This design system is for an AI content production app that starts with live news and ends with an editable video. The visual language should feel calm, serious, and highly usable. It needs to support research, writing, voice generation, visual generation, and editing without turning into a messy admin panel.

The strongest direction is a Vercel-like base with workflow depth layered on top. That means stark canvas, ink-heavy typography, hairline borders, restrained shadows, and mono labels for technical metadata. The difference is the product behavior: this is not a marketing site, it is a studio.

## Design Principles

1. Workflow first: every screen should move the user toward a finished video.
2. Content clarity first: news, scripts, media, and timelines should read instantly.
3. Minimal noise: use whitespace and hierarchy instead of decoration.
4. Precision over playfulness: the app should feel like a production tool.
5. Creative where needed: visuals and video should feel rich, but never chaotic.

## Layout

Use a four-zone layout for the core app:

* Left sidebar for workflow navigation.
* Main workspace for the active step.
* Right context panel for prompts, source notes, settings, and AI help.
* Bottom timeline for review and editing.

This structure works because the app has sequential steps, but each step also needs deep editing control.

## Navigation

Navigation should stay visible. The user should always know where they are in the pipeline.

Recommended sections:

* Dashboard
* News Research
* Script Writer
* Voice Studio
* Visual Studio
* Video Editor
* Projects
* Exports
* Settings

Use clear labels instead of vague icons. Workflow apps fail when navigation becomes clever instead of obvious.

## Color System

The palette should stay neutral and editorial, with controlled accent color use.

* Backgrounds: white and soft slate surfaces.
* Borders: light gray with a stronger gray for focus and active states.
* Primary accent: indigo for key actions and active workflow states.
* Secondary accents: cyan, violet, magenta, and amber for stage-specific status and highlights.
* Semantic colors: green for success, amber for warnings, red for errors.

Avoid bright candy colors across the whole interface. Save stronger color for media, state, and meaning.

## Typography

Use Geist or Inter across the interface.

Typography should do three jobs well:

* Large headings for sections and dashboards.
* Comfortable reading columns for scripts and articles.
* Monospace for timestamps, source labels, prompts, and technical metadata.

The script editor should feel editorial, not code-like. The timeline and metadata should feel technical, not decorative.

## Core Surfaces

Cards and panels should use soft rounding, thin borders, and subtle elevation.

Use these rules:

* Main cards: white surface, hairline border, low shadow.
* Side panels: soft surface with stronger structure.
* Active panels: accent border before adding shadow.
* Empty states: keep them useful, direct, and calm.

## Buttons and Inputs

Primary actions should stand out without shouting.

Secondary actions should stay visible but quiet.

Inputs should be large and readable. This app has a lot of writing and prompt editing, so cramped inputs will hurt usability fast.

## Dashboard Home

The dashboard should summarize the production pipeline at a glance.

Show:

* Saved news items.
* Draft scripts.
* Voices generated.
* Visuals pending approval.
* Videos ready for export.

Include a visible continue-work section so users can jump back into unfinished projects quickly.

## News Research Screen

This screen should feel like a newsroom mixed with a clean research console.

Include:

* Search bar at the top.
* Filters for recency, source, topic, and relevance.
* Search results as cards with title, source, timestamp, summary, and actions.
* Save, cite, and send-to-script buttons.

Results should scan fast. The user should know what is worth reading in a second or two.

## Script Writer Screen

This is the core of the workflow.

Use a clean, Notion-like writing space with strong spacing and a readable column width.

Support:

* Title.
* Hook.
* Intro.
* Body sections.
* Outro.
* Source notes.
* Rewrite, shorten, expand, and tone controls.

The editor should feel calm and focused. It should never feel like a code editor.

## Voice Studio Screen

Use a media-first layout with clear controls.

Show:

* Voice presets.
* Tone controls.
* Speed and pause settings.
* Pronunciation hints.
* Waveform preview.

The user should be able to compare voices quickly and regenerate without losing the script context.

## Visual Studio Screen

Tie visuals directly to script segments.

Each scene card should show:

* Script excerpt.
* Prompt or visual direction.
* Generated image or clip.
* Regenerate and edit controls.
* Status indicator.

The relationship between text and visual should be obvious. No guessing.

## Video Editor Screen

This should feel closer to Descript or CapCut than a traditional dashboard.

Use:

* Large preview area.
* Bottom timeline.
* Tracks for video, audio, subtitles, and overlays.
* Scene blocks with drag handles.
* Frame-accurate controls.

Keep controls visible, but not loud. Video editing is already dense; the UI should reduce friction.

## Motion

Motion should be restrained.

Use short transitions for:

* Hover states.
* Focus states.
* Panel expansion.
* Timeline selection.
* Loading skeletons.

Avoid flashy transitions. The app should feel responsive, not theatrical.

## Data and Media Density

Some screens will be dense, and that is fine. The key is structure.

Use higher density for:

* News lists.
* Search results.
* Asset libraries.
* Timeline rows.
* Export queues.

Use softer spacing for:

* Script writing.
* Prompt generation.
* Voice selection.
* Review states.

## Accessibility

Accessibility matters here because the app mixes reading, editing, and media control.

Design for:

* Strong contrast.
* Visible focus states.
* Keyboard navigation.
* Clear labels.
* Large click targets.
* Screen-reader friendly structure.

Never rely on color alone to communicate status.

## Responsive Behavior

On smaller screens, collapse carefully:

* Sidebar becomes a drawer.
* Right context panel becomes a slide-over or tab.
* Timeline becomes horizontally scrollable.
* Editors keep a comfortable reading width.

Do not cram every panel onto a small screen at once. Prioritize the active step.

## Voice and Tone of the UI

The UI should feel:

* Editorial.
* Precise.
* Modern.
* Professional.
* Creative, but controlled.

It should never feel childish, noisy, or overly decorative.

## Avoid

* Glassmorphism.
* Heavy gradients across the whole app.
* Neon accents.
* Excessive shadows.
* Tiny text in editing areas.
* Icon-only navigation for core workflow steps.
* Generic admin-dashboard patterns.
* Toy-like rounded visuals.

## Implementation Guidance

When building this UI, prefer:

* Clean component composition.
* Feature-based layout.
* Reusable cards, panels, and editors.
* Clear state handling for draft, generating, preview, and published states.
* A consistent spacing scale.

Every screen should point to the next action. The design should guide the user from research to script to voice to visuals to final export without making them think too hard.

## Do's and Don'ts

### Do

* Use ink, white, and slate as the base system.
* Use one primary accent for actions and active states.
* Keep typography calm, geometric, and readable.
* Use mono labels for source, prompt, and technical metadata.
* Use subtle borders and soft shadows instead of loud effects.
* Make the workflow obvious at every step.
* Keep the editor and timeline highly functional.

### Don't

* Don't turn the whole app into a colorful creative playground.
* Don't bury the workflow inside nested menus.
* Don't use oversized decorative gradients on every screen.
* Don't make the script editor feel like a code editor.
* Don't overuse animation to hide weak structure.
* Don't mix too many accent colors in the same view.
* Don't make the timeline or media tools look secondary to the dashboard.
