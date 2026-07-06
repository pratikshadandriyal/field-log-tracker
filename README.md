# Field Log — A Task Tracker with an Analyst's Eye

A web-based to-do list that goes beyond basic task management by layering in personal productivity analytics — completion trends, streaks, a GitHub-style activity heatmap, category and priority breakdowns, and a lightweight mood log. Built to show that data analysis thinking can live outside of BI tools, in a real, usable product.

**Live demo:** [pratikshadandriyal.github.io/field-log-tracker](https://pratikshadandriyal.github.io/field-log-tracker/)

## Why I built this

As a data analyst, most of my portfolio work lives in SQL, Power BI, and Python notebooks. I wanted one project that shows I can also design and build a front-end product end-to-end — and instead of a generic to-do app, I used it as a chance to apply analyst thinking to a domain everyone understands: personal task management.

Every feature in this project is intentional:
- The task tracker itself is deliberately simple (no backend, no frameworks) so the logic is easy to explain in an interview.
- The analytics layer is where the "analyst" part shows — real computed metrics (completion rate, streaks, category/priority breakdowns, weekly trend comparisons), not decoration.
- It's built as a genuine website, not a dashboard — the data insights are woven into a product people would actually use daily.

## Features

**Task management**
- Add, edit, complete, and delete tasks
- Categorize by Work / Personal / Learning / Other
- Priority levels (High / Medium / Low)
- Optional due dates, with an "Upcoming (next 7 days)" panel that flags overdue and due-soon items
- Search and filter by text, category, and priority

**Analytics**
- Day streak counter
- Overall and category-wise completion rate
- 12-week activity heatmap (graph-paper style, inspired by GitHub's contribution graph)
- 14-day completion trend, drawn on `<canvas>` with no external chart library
- Auto-generated weekly summary comparing this week to last week
- Rule-based insights (e.g. "Work is your most consistent category at 82% completion")

**Extras**
- End-of-day mood tracker (emoji-based), with a 7-day recap strip
- CSV export of full task history — designed to be analysis-ready if opened in Excel or Power BI
- Dark mode toggle
- "Load sample data" button so the analytics views aren't empty on first visit

## Tech stack

Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step, no backend. Data persists in the browser via `localStorage`. This was a deliberate choice: it keeps every line of logic explainable, and it's free to host as a static site.

**Known limitation:** since data lives in `localStorage`, it's tied to a single browser/device — there's no cross-device sync. A natural next step would be adding a backend (e.g. Firebase or a small SQL-backed API) for multi-device sync, which I'd frame as a deliberate scoping decision for v1 rather than an oversight.

## Running locally

Just open `index.html` in a browser — no build step or server required.

## Deploying to GitHub Pages

1. Push these files (`index.html`, `style.css`, `script.js`) to the root of a GitHub repo.
2. Go to **Settings → Pages**, set the source to your main branch, and save.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## File structure

```
├── index.html      # page structure and markup
├── style.css       # design system (CSS variables) and layout
├── script.js       # all task logic, storage, and analytics computations
└── README.md
```

## Author

Built by Pratiksha Dandriyal — [github.com/pratikshadandriyal](https://github.com/pratikshadandriyal)
