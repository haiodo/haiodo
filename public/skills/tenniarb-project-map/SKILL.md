---
name: tenniarb-project-map
description: Use when the user wants a project plan, release plan, roadmap, feature lifecycle, team matrix, product or requirement model as a Tenniarb .tenn map instead of a tracker board, or wants an existing map updated, reviewed or split. Builds the map through the tenniarb MCP tools, keeps it readable, and checks it by rendering.
---

# Project maps in Tenniarb

A `.tenn` file is text: items at positions, links between them, colours for state. A project map is
that text committed next to the code, so the plan diffs in review like everything else. This skill is
the method distilled from maps kept from 2018 to 2022 - release plans, a feature lifecycle, a team
matrix, product and requirement models - and from a run over a 1778-issue tracker export.

The tenniarb design skill covers the drawing loop, syntax and traps. Read it first if you have not
(`read_skill`); this file only says how to use it for project management.

## Start here

Ask, in one go, before drawing anything: the time frame, the milestones with their dates, who works on
what, and where the ids come from (the tracker). Without dates a release plan is a wish list; without
ids it cannot be updated from the tracker later.

Then pick the map type:

| The user asks for | Draw | Element |
|---|---|---|
| When the release ships and who does what | release plan: quarters, milestones, one row per engineer | `Release plan` |
| How a feature gets from idea to release | lifecycle chain with gates | `Feature lifecycle` |
| Who is on which project | team matrix | `Who works on what` |
| How product, project and tasks relate | data model | `Product model` |
| Where the work is: done, open bugs, by area | area summary: one node per area with counts | `Directions`, `Open bugs` |

### Where the axes come from

Take the axis from the tracker's own field, not from labels. Labels are multi-valued and often absent:
in the FUSIO export 1325 of 1778 issues carried no area label at all, and one tag (`ux/ui:usability`,
263 issues) would have made UX a "direction" spanning tracker, chat and office. Use the component field
first, a label only where the field is empty, and keep the rest as one node `Без направления` with its
count - a remainder you can see is honest, a remainder you spread across areas is not.

Say in the file how the axis was built. `body` belongs to an `item` only: a `body` inside an `element`
passes `check` silently and draws nothing, so put the rule into the `body` of the root item.

## Five rules that keep the map usable

1. **One element is one map.** The file is the project space; each element is a canvas. The files this
   skill is based on reached 124 elements in 3 MB, and that is fine as long as each element is read on
   its own.
2. **A work unit's name is its id.** A ticket, a task, a requirement: `T-101`, not "доработка сессий".
   Aggregate nodes - an area, a milestone, a sprint, the product above them - have no id; give them a
   stable name and put the count into `body`. In a classic diagram the name is the only handle a link
   has: in the real files two items were both called `Releases` and three were called `Clark`, and
   `link "Clark" "sign"` pointed at whichever came first.
3. **Colour means state, always the same state.** Fix one palette per file and keep it: green done,
   yellow in progress, blue next, purple gate, red risk. Take the light ramp (`green-200`, `yellow-200`,
   `blue-200`, `purple-200`) or the hex it stands for: in a classic diagram the text colour is chosen
   from the fill by contrast, and `text-color` does not override it reliably, so a dark fill ends up with
   black text on dark green. An aggregate has no state but a share of done: more than half - green, some
   - yellow, none - blue, not a direction at all - grey; write the threshold into the root `body`.
4. **Notes go into `body`, not into nodes.** One requirement file carried 137 body blocks against 269
   items; a paragraph as a node is a node that will never be read.
5. **A link needs a colour.** `styles { line { color gray-900 } }` at the top of a classic element; a
   link without a stroke colour draws nothing, and `color black` is not a palette colour either.

## Recipes

All four are classic diagrams: `item` and `link`, explicit `pos`, no `auto-layout`, no children.
Y points up: `pos 0 -160` is a row below `pos 0 0`.

### Release plan

A Gantt drawn on a canvas. Top row: the quarters, linked in a chain so they read as an axis. Second
row: milestones linked to their dates. Then one row per engineer, one box per ticket in the column of
the quarter it ships in, filled by state.

```tenn
element "Release plan" {
  styles { line { color gray-900 } }
  item "Q1" { pos 0 0; width 200; font-size 20 }
  item "Q2" { pos 240 0; width 200; font-size 20 }
  link "Q1" "Q2"
  item "Code freeze" { pos 480 -60; color magenta }
  item "3/1" { pos 560 -120; font-size 12 }
  link "Code freeze" "3/1"
  item "AB" { pos -120 -180 }
  item "T-101" { pos 60 -180; color green-200; body %{Сессии\nи таймауты} }
  item "T-102" { pos 300 -180; color yellow-200; body %{Отчёты} }
}
```

The rows are the point: an engineer reads one line, a manager reads the colour. A feature too big to
fit a box gets a child element with its own task list - the drill-down that replaces a status meeting.

### Feature lifecycle

One chain from ticket to release, arrows on the links, gates coloured, a loop back to the start.

```tenn
element "Feature lifecycle" {
  styles { line { color gray-900 } }
  item "JIRA issue" { pos 0 0; color yellow-200 }
  item "ENG proposal" { pos 180 0 }
  item "Sign" { pos 360 0; color purple-200 }
  item "Impl tasks" { pos 540 0 }
  item "Exit QA" { pos 900 0; color blue-200 }
  link "JIRA issue" "ENG proposal" { display arrow }
  link "ENG proposal" "Sign" { display arrow }
  link "Sign" "Impl tasks" { display arrow }
  link "Impl tasks" "Exit QA" { display arrow }
  item "Planning" { pos 1080 -80 }
  link "Exit QA" "Planning" { display arrow }
  link "Planning" "JIRA issue" { display arrow }
}
```

Put a person node only where a signature matters; in the real files `Clark` appeared as a step three
times and that was the approval, not the assignee.

### Who works on what

Projects on the left with a one-line description in `body`, people on the right, a platform tag per
person, and a link from each person to each project. This map replaced a weekly status call: the answer
to "who can take this" is one hop from the project.

### Product and requirement model

`Product` → `Initiative` → `Epic` → `Story` → `Task`, `Product` → `Project` → `Sprint` → `Milestone`,
`Team` → `Project`. The cardinality that is not visible in the picture belongs in `body` notes: a
product is implemented by several projects, a story by several tasks, a project may not belong to a
product at all.

Requirements work is the same shape with different names: domain clusters, a requirement item, a
verification and a validation test linked to it, a risk, a design control. One real file held the whole
QMS model of a medical product this way, 269 items and 137 notes.

### Where the work is

Two elements over the tracker export: `Directions` - the product in the middle, one node per area with
`N задач / N сделано / N открытых багов` in `body`, a link from the centre to each; `Open bugs` - the
open bugs grouped by area and state, one node per bug, named by its id.

```tenn
element "Directions" {
  item "Product - 1778 задач" { pos 0 0; width 240; body %{ось: поле component\nиначе метка\n625 задач без признака} }
  item "Tracker" { pos 0 300; body %{231 задач / 93 сделано / 69 открытых багов} }
  item "Chat" { pos 300 200; body %{138 задач / 45 сделано / 45 открытых багов} }
  link "Product - 1778 задач" "Tracker" { color #333333; display arrow }
  link "Product - 1778 задач" "Chat" { color #333333; display arrow }
}
```

A summary element may have no links at all: a table of areas by milestone is a table, not a graph, and
invented lines along a column read as a false chain (`A -> B` where both are just rows). Leave it without
links, or keep links only where they mean "belongs to" or "blocks".

## Updating an existing map

- Change the map in place. Do not paste a copy: the real files carry `Workflow`, `Workflow v2`,
  `Workflow v3` and a `T_3_v2.tenn`, and every change after the copy means comparing two pictures by eye.
  Git keeps the history; the canvas does not need to.
- Keep a release in its own file while it is being planned and fold it into the master map when it ships:
  the corpus this skill comes from has `iTest-7.3.tenn`, `8.0.tenn` and `8.0_subtasks.tenn` next to the
  master `spirent.tenn`. The master stays readable, the release file stays small enough to work in.
- When the tracker is the source of truth, rebuild the boxes from it: read the issues of the release
  (fields: id, state, assignee), then place one box per issue in its row and column. Manual layout stays
  only where it means something - a row per engineer, a column per quarter.
- Keep the element under about 60 items, but count area, not only nodes: 58 nodes drawn as a ring came
  out 3180x2933 and 20 nodes as a hub 2572x2346, neither readable on one screen. Aim at roughly
  1200x900, split by release, quarter or area under 60 nodes, and link the parts through a parent map:
  one file in this collection had 2780 nodes under a single element, and nobody can read that.

## Checks before you report

- `tenniarb check file.tenn` exits 0, or `validate` through the tools, no errors.
- `check` says nothing about layout: it passes a file whose straight lines along a column read as a
  false chain, and it passes a `body` inside an `element` that never draws. Render every element you
  touched and look at it: links visible, text not clipped, boxes not overlapping, colours from the
  fixed palette, the scene close to 1200x900.
- A file that stays in the user's own repository may name its own clients and people; a file that is
  published, sent out or embedded in a page gets `P-1`, `T-101`, `AB` and no photos.
- Say in the answer which elements you changed and what a reader should look at first.

## Example

`public/tenniarb/project-map.tenn` in the blog repository holds all four maps with invented data; it is
also what the post "Карта вместо доски" embeds. Copy it as a starting point.

`foundation-tasks/design/fusio-project.tenn` is the same method on real data: 1778 issues of the FUSIO
project, six elements - `Направления`, `Что сделали` with two drill-downs, `Где баги`, `Спринты`.
