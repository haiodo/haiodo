#!/usr/bin/env node
// Draws the SVG charts of the commit retrospective from commits.csv, summary.json and github.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv.mjs';
import { ASSETS_DIR, COPIES, DATA_DIR, GROUPS, PRIVATE_LABEL } from './repos.mjs';
import { Chart, W, r1, textWidth } from './chart.mjs';
import { FLOOR, logHeight, logTicks } from './scale.mjs';

// Mid-tones that clear 3:1 on white, on #17181c and on the blog's #242936; CVD separation checked,
// green, orange and violet also pairwise.
const GREEN = '#2e9e5b';
const ORANGE = '#e8590c';
const BLUE = '#2a78d6';
const VIOLET = '#7c5cd6';

const THIN = '\u2009';
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
const pct = (x) => `${(x * 100).toFixed(1).replace('.', ',')}${THIN}%`;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const plural = (n, [one, few, many]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
const dayMonth = (d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const tickLabel = (v) => (v >= 1e6 ? `${v / 1e6}${THIN}млн` : v >= 1000 ? `${v / 1000}${THIN}тыс.` : String(v));

function niceStep(rough) {
  const p = 10 ** Math.floor(Math.log10(rough));
  const f = rough / p;
  return p * (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10);
}

const rows = parseCsv(await readFile(path.join(DATA_DIR, 'commits.csv'), 'utf8')).map((r) => ({
  ...r,
  added: Number(r.added),
  deleted: Number(r.deleted),
}));
const github = JSON.parse(await readFile(path.join(DATA_DIR, 'github.json'), 'utf8'));
const summary = JSON.parse(await readFile(path.join(DATA_DIR, 'summary.json'), 'utf8'));
const counted = rows.filter((r) => r.kind === 'work' || r.kind === 'move');
const lastDate = counted.reduce((m, r) => (r.date > m ? r.date : m), '');
const lastYear = Number(lastDate.slice(0, 4));
const partialYear = `${lastYear} - данные по ${dayMonth(lastDate)}`;

function linesByQuarter() {
  const qIndex = (d) => Number(d.slice(0, 4)) * 4 + Math.ceil(Number(d.slice(5, 7)) / 3) - 1;
  const first = Math.min(...counted.map((r) => qIndex(r.date)));
  const n = qIndex(lastDate) - first + 1;
  const zeros = () => new Array(n).fill(0);
  const [added, deleted, moveAdded, moveDeleted] = [zeros(), zeros(), zeros(), zeros()];
  for (const r of counted) {
    const i = qIndex(r.date) - first;
    // A move's lines were written earlier or elsewhere: own series, never the code one.
    (r.kind === 'move' ? moveAdded : added)[i] += r.added;
    (r.kind === 'move' ? moveDeleted : deleted)[i] += r.deleted;
  }
  const average = (a) => a.map((_, i) => (i < 3 ? null : (a[i] + a[i - 1] + a[i - 2] + a[i - 3]) / 4));

  // One log scale for both panels: the axis is the floor,
  // and each tenfold above or below it adds perDecade px.
  const padL = 66;
  const padR = 12;
  const plotTop = 46;
  const perDecade = 28;
  const h = (v) => logHeight(v, FLOOR, perDecade);
  const span = (ticks) => (ticks.length - 1) * perDecade;
  const [up, down] = [added, deleted].map((a) => logTicks(FLOOR, Math.max(...a)));
  const y0 = plotTop + span(up);
  const slot = (W - padL - padR) / n;
  const xAt = (i) => padL + (i + 0.5) * slot;
  const barX = (i) => xAt(i) - (slot - 2) / 2;
  const axis1 = y0 + span(down);

  const hasMoves = moveAdded.some(Boolean) || moveDeleted.some(Boolean);
  const [moveUp, moveDown] = hasMoves ? [moveAdded, moveDeleted].map((a) => logTicks(FLOOR, Math.max(...a))) : [[], []];
  const titleY = axis1 + 44;
  const plot2Top = titleY + 14;
  const y0Move = plot2Top + (hasMoves ? span(moveUp) : 0);
  const axis2 = hasMoves ? y0Move + span(moveDown) : axis1;
  const height = axis2 + 70;

  const c = new Chart('lines-by-quarter');
  const swatch = (color) => (lx) =>
    c.add(`<rect x="${lx}" y="8" width="10" height="10" rx="2" fill="${color}" fill-opacity="0.65"/>`);
  const averages = (lx) => {
    c.add(`<line x1="${lx}" y1="13" x2="${lx + 14}" y2="13" stroke="${GREEN}" stroke-width="2" stroke-linecap="round"/>`);
    c.add(`<line x1="${lx + 18}" y1="13" x2="${lx + 32}" y2="13" stroke="${ORANGE}" stroke-width="2" stroke-linecap="round"/>`);
  };
  const legend = [
    { label: 'добавлено', width: 10, draw: swatch(GREEN) },
    { label: 'удалено', width: 10, draw: swatch(ORANGE) },
    { label: 'среднее за 4 квартала', width: 32, draw: averages },
  ];
  let x = padL;
  for (const item of legend) {
    item.draw(x);
    c.text(x + item.width + 6, 17, item.label, { size: 14 });
    x += item.width + 6 + textWidth(item.label, 14) + 22;
  }
  c.text(padL - 6, plotTop - 12, 'строк', { size: 12, anchor: 'end', muted: true });

  const grid = (ticksUp, ticksDown, zero) => {
    c.hairline(padL, zero, W - padR, zero, 0.45);
    c.text(padL - 6, zero + 4, tickLabel(FLOOR), { size: 12, anchor: 'end', muted: true });
    for (const [ticks, sign] of [[ticksUp, -1], [ticksDown, 1]]) {
      for (const t of ticks.slice(1)) {
        const y = zero + sign * h(t);
        c.hairline(padL, y, W - padR, y, 0.15);
        c.text(padL - 6, y + 4, tickLabel(t), { size: 12, anchor: 'end', muted: true });
      }
    }
  };
  grid(up, down, y0);
  added.forEach((v, i) => c.bar(barX(i), y0 - h(v), slot - 2, h(v), -1, GREEN, 0.65));
  deleted.forEach((v, i) => c.bar(barX(i), y0, slot - 2, h(v), 1, ORANGE, 0.65));
  // An average at or below the floor has no point, so the line breaks there.
  const line = (series, sign, color) => {
    const pts = average(series).map((v, i) => (v === null || v <= FLOOR ? null : [xAt(i), y0 + sign * h(v)]));
    c.line(pts, color);
  };
  line(added, -1, GREEN);
  line(deleted, 1, ORANGE);

  if (hasMoves) {
    c.add(`<rect x="${padL}" y="${titleY - 10}" width="10" height="10" rx="2" fill="${VIOLET}" fill-opacity="0.65"/>`);
    c.text(padL + 16, titleY, 'переносы и массовые правки', { size: 14 });
    c.text(W - padR, titleY, 'в строки кода не входят', { size: 12, anchor: 'end', muted: true });
    grid(moveUp, moveDown, y0Move);
    moveAdded.forEach((v, i) => c.bar(barX(i), y0Move - h(v), slot - 2, h(v), -1, VIOLET, 0.65));
    moveDeleted.forEach((v, i) => c.bar(barX(i), y0Move, slot - 2, h(v), 1, VIOLET, 0.65));
  }

  const year0 = Math.floor(first / 4);
  for (const axisY of hasMoves ? [axis1, axis2] : [axis1]) {
    for (let y = year0; y <= lastYear; y++) {
      const i = y * 4 - first;
      if (i < 0) continue;
      c.hairline(padL + i * slot, axisY, padL + i * slot, axisY + 4, 0.4);
      // Clamped: a last year with only its first quarters would push the label out of the chart.
      const labelX = Math.min(padL + (i + 2) * slot, W - 4 - textWidth(String(y), 13) / 2);
      if ((y - year0) % 2 === 0) c.text(labelX, axisY + 18, String(y), { size: 13, anchor: 'middle', muted: true });
    }
  }
  c.text(padL, axis2 + 40, `Код без генерации и lock-файлов. ${partialYear}`, { size: 12, muted: true });
  c.text(padL, axis2 + 58, `Шкала логарифмическая: квартал меньше ${FLOOR} строк без столбца`, { size: 12, muted: true });
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  return c.render(
    height,
    'Строки кода по кварталам',
    `Добавлено ${fmt(sum(added))} и удалено ${fmt(sum(deleted))} строк кода с ${year0} по ${lastYear} год, по кварталам, со скользящим средним за 4 квартала. Шкала логарифмическая: у квартала меньше ${FLOOR} строк столбца нет. Отдельно переносы и массовые правки: ${fmt(sum(moveAdded))} добавлено и ${fmt(sum(moveDeleted))} удалено.`,
  );
}

function commitsByYear() {
  const est = summary.estimate;
  const years = counted.map((r) => Number(r.date.slice(0, 4)));
  const first = Math.min(...years);
  const n = lastYear - first + 1;
  const counts = new Array(n).fill(0);
  for (const y of years) counts[y - first]++;
  const guess = counts.map((_, i) => est?.years[first + i]?.mid ?? 0);
  const tops = counts.map((v, i) => v + guess[i]);

  const padL = 46;
  const padR = 12;
  const plotTop = 44;
  const plotH = 220;
  const step = niceStep(Math.max(...tops) / 4);
  const top = Math.ceil(Math.max(...tops) / step) * step;
  const k = plotH / top;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(24, slot - 4);
  const axisY = plotTop + plotH;
  const notes = [
    est && 'Штриховка - оценка: среднее при полной занятости минус видимые коммиты года.',
    summary.excluded.cvs_parts && 'В CVS-проектах сообщение, повторённое за 10 минут, - один коммит.',
  ].filter(Boolean);
  const height = axisY + 48 + notes.length * 18;
  const barX = (i) => padL + (i + 0.5) * slot - bw / 2;

  const c = new Chart('commits-by-year');
  const hatch = 'commits-by-year-hatch';
  c.defs.push(
    `<pattern id="${hatch}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${BLUE}" fill-opacity="0.12"/><line x1="0" y1="0" x2="0" y2="6" stroke="${BLUE}" stroke-width="2"/></pattern>`,
  );
  c.add(`<rect x="${padL}" y="8" width="10" height="10" rx="2" fill="${BLUE}"/>`);
  c.text(padL + 16, 17, 'коммиты', { size: 13 });
  if (est) {
    const hatchX = padL + 16 + textWidth('коммиты', 13) + 22;
    c.add(`<rect x="${r1(hatchX)}" y="8" width="10" height="10" fill="url(#${hatch})" stroke="${BLUE}" stroke-width="1"/>`);
    c.text(hatchX + 16, 17, 'оценка: закрытые репозитории', { size: 13 });
  }

  for (let v = 0; v <= top; v += step) {
    const y = axisY - v * k;
    c.hairline(padL, y, W - padR, y, v === 0 ? 0.45 : 0.15);
    c.text(padL - 6, y + 4, fmt(v), { size: 12, anchor: 'end', muted: true });
  }
  counts.forEach((v, i) => c.bar(barX(i), axisY - v * k, bw, v * k, -1, BLUE));
  // The estimate is hatched and dashed: never the same mark as a measured bar.
  guess.forEach((g, i) => {
    if (g <= 0) return;
    c.add(
      `<rect x="${r1(barX(i))}" y="${r1(axisY - tops[i] * k)}" width="${r1(bw)}" height="${r1(g * k)}" fill="url(#${hatch})" stroke="${BLUE}" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>`,
    );
  });
  const lineY = est ? axisY - est.average * k : axisY;
  const lineLabel = est ? `среднее при полной занятости: ${fmt(est.average)}` : '';
  const lineX = est ? padL + (Math.floor((est.definitions.hidden[0] + est.definitions.hidden[1]) / 2) - first + 0.5) * slot : 0;
  if (est) {
    c.dashed(padL, W - padR, lineY);
    c.text(lineX, lineY - 7, lineLabel, { size: 12, anchor: 'middle' });
  }

  // Direct labels only where they fit: the tallest bars first, the last (partial) year always.
  const bars = tops.map((t, i) => ({ x0: barX(i), top: axisY - t * k }));
  const half = textWidth(lineLabel, 12) / 2;
  // Value labels stay clear of the average line and its label.
  const placed = est
    ? [
        { x0: padL, x1: W - padR, y0: lineY - 2, y1: lineY + 2 },
        { x0: lineX - half - 3, x1: lineX + half + 3, y0: lineY - 22, y1: lineY - 2 },
      ]
    : [];
  const free = (x0, x1, y0, y1) =>
    x0 >= padL - 6 &&
    x1 <= W - 2 &&
    !placed.some((p) => x0 < p.x1 && p.x0 < x1 && y0 < p.y1 && p.y0 < y1) &&
    !bars.some((b) => x0 < b.x0 + bw && b.x0 < x1 && b.top < y1);
  const order = [...counts.keys()].filter((i) => guess[i] === 0).sort((a, b) => counts[b] - counts[a]);
  let shown = 0;
  for (const i of [n - 1, ...order.filter((j) => j !== n - 1)]) {
    if (!counts[i] || shown >= 8) continue;
    const label = fmt(counts[i]);
    const w = textWidth(label, 12);
    const { x0, top: topY } = bars[i];
    const spots = [
      { anchor: 'middle', x: x0 + bw / 2, left: x0 + bw / 2 - w / 2 },
      { anchor: 'end', x: x0 + bw, left: x0 + bw - w },
      { anchor: 'start', x: x0, left: x0 },
    ];
    // Above the bar; a bar that stops just under the average line takes its label above the line.
    const baselines = est && lineY < topY ? [topY - 6, lineY - 8] : [topY - 6];
    const spotAt = (sp, base) => free(sp.left - 3, sp.left + w + 3, base - 15, base + 3);
    let base = baselines.find((b) => spots.some((sp) => spotAt(sp, b)));
    let spot = spots.find((sp) => base !== undefined && spotAt(sp, base));
    if (!spot && i === n - 1) [base, spot] = [baselines[0], spots[1]];
    if (!spot) continue;
    placed.push({ x0: spot.left - 3, x1: spot.left + w + 3, y0: base - 15, y1: base + 3 });
    c.text(spot.x, base, label, { size: 12, anchor: spot.anchor });
    shown++;
  }
  counts.forEach((_, i) => {
    if ((i % 2) === 0) c.text(padL + (i + 0.5) * slot, axisY + 18, String(first + i), { size: 13, anchor: 'middle', muted: true });
  });
  c.text(padL, axisY + 40, `Коммиты без слияний и дублей, переносы включены. ${partialYear}`, { size: 12, muted: true });
  notes.forEach((note, i) => c.text(padL, axisY + 58 + i * 18, note, { size: 12, muted: true }));
  const peakYear = first + counts.indexOf(Math.max(...counts));
  const guessed = est
    ? ` Штрихованная часть столбцов ${est.definitions.hidden[0]}-${est.definitions.hidden[1]} - оценка, не измерение: она доводит год до среднего при полной занятости (${fmt(est.average)} в год), всего ${fmt(est.totals.mid)} коммитов в закрытых репозиториях.`
    : '';
  return c.render(
    height,
    'Коммиты по годам',
    `Коммитов по годам с ${first} по ${lastYear}: всего ${fmt(counts.reduce((s, v) => s + v, 0))}, больше всего в ${peakYear} году (${fmt(Math.max(...counts))}); переносы и массовые правки включены.${guessed}`,
  );
}

function projectsTimeline() {
  const year = (d) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12 + (Number(d.slice(8)) - 1) / 372;
  const mergeSpans = (spans, gap) => {
    const merged = [];
    for (const [from, to] of [...spans].sort()) {
      const prev = merged.at(-1);
      if (!prev || year(from) - year(prev[1]) > gap) merged.push([from, to]);
      else if (to > prev[1]) prev[1] = to;
    }
    return merged;
  };
  const list = summary.projects
    .filter((p) => p.first)
    .map((p) => {
      const active = (p.members ?? []).filter((m) => m.commits_all > 0);
      const group = Object.values(GROUPS).find((g) => g.label === p.name);
      // The closed projects have no breakdown: their bar breaks where commits pause over a year.
      const dates = counted.filter((r) => r.repo === PRIVATE_LABEL).map((r) => [r.date, r.date]);
      let spans = [[p.first, p.last]];
      if (p.name === PRIVATE_LABEL) spans = mergeSpans(dates, 1);
      else if (!group?.continuous && active.length) spans = mergeSpans(active.map((m) => [m.first, m.last]), 2 / 12);
      const label = active.length > 1 ? `${p.name} (${active.length} ${plural(active.length, ['репозиторий', 'репозитория', 'репозиториев'])})` : p.name;
      return { label, commits: p.commits_all, first: p.first, spans, marks: p.marks ?? [] };
    })
    .sort((a, b) => cmp(a.first, b.first) || cmp(a.label, b.label));

  const t0 = Math.floor(year(list[0].first));
  const t1 = lastYear + 1;
  const padL = 12;
  const padR = 12;
  const plotL = 24; // leaves room for the first year label
  const top = 26;
  const pitch = 32;
  const plotW = W - plotL - 24;
  const xAt = (t) => plotL + ((t - t0) / (t1 - t0)) * plotW;
  const bottom = top + list.length * pitch;
  const height = bottom + 66;

  const c = new Chart('projects-timeline');
  for (let y = t0; y <= t1; y += 2) {
    c.hairline(xAt(y), top - 4, xAt(y), bottom - 4, 0.1);
    if (y < t1) {
      c.text(xAt(y), 12, String(y), { size: 12, anchor: 'middle', muted: true });
      c.text(xAt(y), bottom + 14, String(y), { size: 12, anchor: 'middle', muted: true });
    }
  }
  list.forEach((row, i) => {
    const y = top + i * pitch;
    c.text(padL, y + 11, row.label, { size: 14 });
    c.text(W - padR, y + 11, fmt(row.commits), { size: 13, anchor: 'end', muted: true });
    for (const [from, to] of row.spans) {
      const x0 = xAt(year(from));
      c.bar(x0, y + 15, Math.max(xAt(year(to) + 1 / 12) - x0, 6), 8, 0, BLUE);
    }
    for (const mark of row.marks) {
      const x = xAt(year(mark.date));
      c.add(`<line x1="${r1(x)}" y1="${y + 12}" x2="${r1(x)}" y2="${y + 26}" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>`);
      c.text(x - 6, y + 11, mark.label, { size: 12, anchor: 'end' });
    }
  });
  c.text(padL, bottom + 38, 'Справа - коммиты, переносы включены. Полоса: от первого до последнего коммита.', { size: 12, muted: true });
  c.text(padL, bottom + 56, 'В группах - репозитории, где есть коммиты автора.', { size: 12, muted: true });
  return c.render(
    height,
    'Проекты по годам',
    `${list.length} строк: проекты и группы репозиториев, с ${t0} по ${lastYear} год.`,
  );
}

// Median commit size per year on a log axis, with the band from the 25th to the 75th percentile.
function commitSizeByYear() {
  const rowsBy = Object.entries(summary.sizes).map(([y, e]) => ({ year: Number(y), ...e }));
  const first = rowsBy[0].year;
  const n = lastYear - first + 1;
  const padL = 46;
  const padR = 12;
  const plotTop = 30;
  const plotH = 220;
  const decades = Math.ceil(Math.log10(Math.max(...rowsBy.map((r) => r.p75), 10)));
  const axisY = plotTop + plotH;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(18, slot - 4);
  const yAt = (v) => axisY - (Math.log10(Math.max(v, 1)) / decades) * plotH;
  const xAt = (year) => padL + (year - first + 0.5) * slot;
  const height = axisY + 66;

  const c = new Chart('commit-size-by-year');
  c.text(padL - 36, plotTop - 12, 'строк кода, логарифмическая шкала', { size: 12, muted: true });
  for (let d = 0; d <= decades; d++) {
    const y = axisY - (d / decades) * plotH;
    c.hairline(padL, y, W - padR, y, d === 0 ? 0.45 : 0.15);
    c.text(padL - 6, y + 4, fmt(10 ** d), { size: 12, anchor: 'end', muted: true });
  }
  for (const r of rowsBy) {
    const bandTop = yAt(r.p75);
    const bandBottom = Math.max(yAt(r.p25), bandTop + 3);
    c.bar(xAt(r.year) - bw / 2, bandTop, bw, bandBottom - bandTop, -1, BLUE, 0.3);
  }
  c.line(rowsBy.map((r) => [xAt(r.year), yAt(r.median)]), BLUE);
  // A hollow marker: fewer than 20 commits, the quantiles of such a year are noise.
  for (const r of rowsBy) c.circle(xAt(r.year), yAt(r.median), 4, r.count < 20 ? 'none' : BLUE, BLUE);

  const solid = rowsBy.some((r) => r.count >= 20) ? rowsBy.filter((r) => r.count >= 20) : rowsBy;
  const picked = new Set([
    rowsBy.at(-1),
    solid.reduce((a, b) => (b.median > a.median ? b : a)),
    solid.reduce((a, b) => (b.median < a.median ? b : a)),
  ]);
  for (const r of picked) c.text(xAt(r.year), yAt(r.p75) - 6, fmt(r.median), { size: 12, anchor: 'middle' });
  rowsBy.forEach((r, i) => {
    if (i % 2 === 0) c.text(xAt(r.year), axisY + 18, String(r.year), { size: 13, anchor: 'middle', muted: true });
  });
  c.text(padL, axisY + 40, 'Строк кода в рабочем коммите, без генерации и переносов. Полоса - p25-p75.', { size: 12, muted: true });
  c.text(padL, axisY + 58, `Полый маркер - меньше 20 коммитов в году. ${partialYear}`, { size: 12, muted: true });
  return c.render(
    height,
    'Размер коммита по годам',
    `Медиана размера рабочего коммита (добавлено плюс удалено строк кода) по годам с ${first} по ${lastYear}, от ${fmt(Math.min(...solid.map((r) => r.median)))} до ${fmt(Math.max(...solid.map((r) => r.median)))} строк в годах, где коммитов не меньше 20; полоса - от 25-го до 75-го процентиля, шкала логарифмическая.`,
  );
}

function githubVsUnique() {
  const total = github.totals.commits;
  const copies = github.copies;
  const closed = github.totals.privateCommits ?? 0;
  const unique = counted.length;
  const imports = counted.filter((r) => r.kind === 'move').length;
  const noted = COPIES.repos.length ? `${COPIES.note}${closed ? '; ' : ''}` : '';
  const items = [
    {
      label: 'GitHub: коммиты в профиле',
      note: `${noted}${closed ? `закрытые проекты: ${fmt(closed)}` : ''}` || 'вклады-коммиты, как их считает GitHub',
      value: total,
      fill: 'currentColor',
      opacity: 0.35,
    },
    ...(COPIES.repos.length
      ? [
          {
            label: `GitHub ${COPIES.without}`,
            note: `минус ${fmt(copies.commits)} ${plural(copies.commits, ['коммит', 'коммита', 'коммитов'])} (${pct(copies.share)})`,
            value: copies.commitsWithoutCopies,
            fill: 'currentColor',
            opacity: 0.35,
          },
        ]
      : []),
    {
      label: 'Уникальные коммиты в репозиториях',
      note: `без слияний и дублей, из них ${fmt(imports)} - переносы и массовые правки`,
      value: unique,
      fill: BLUE,
      opacity: 1,
    },
  ];
  const padL = 12;
  const valueW = 70;
  const pitch = 58;
  const height = items.length * pitch + 10;
  const max = Math.max(...items.map((it) => it.value));
  const scale = (W - padL - 12 - valueW) / max;

  const c = new Chart('github-vs-unique');
  items.forEach((it, i) => {
    const y = 8 + i * pitch;
    c.text(padL, y + 13, it.label, { size: 15 });
    c.text(padL, y + 29, it.note, { size: 12, muted: true });
    c.bar(padL, y + 36, it.value * scale, 14, 0, it.fill, it.opacity);
    c.text(padL + it.value * scale + 8, y + 48, fmt(it.value), { size: 15, bold: true });
  });
  const without = COPIES.repos.length ? `, ${COPIES.without} ${fmt(copies.commitsWithoutCopies)}` : '';
  return c.render(
    height,
    'Коммиты: GitHub и уникальные',
    `GitHub насчитал ${fmt(total)} ${plural(total, ['коммит', 'коммита', 'коммитов'])}${without}; уникальных коммитов в репозиториях ${fmt(unique)}.`,
  );
}

const charts = {
  'lines-by-quarter.svg': linesByQuarter,
  'commits-by-year.svg': commitsByYear,
  'projects-timeline.svg': projectsTimeline,
  'commit-size-by-year.svg': commitSizeByYear,
  'github-vs-unique.svg': githubVsUnique,
};
await mkdir(ASSETS_DIR, { recursive: true });
for (const [file, draw] of Object.entries(charts)) {
  const svg = draw();
  await writeFile(path.join(ASSETS_DIR, file), svg);
  console.log(`${file}: ${Buffer.byteLength(svg)} bytes`);
}
