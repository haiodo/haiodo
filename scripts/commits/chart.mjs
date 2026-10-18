// SVG builder of the retrospective charts. render() throws when a label leaves the viewBox, or when
// two labels, or a label and a dashed line, overlap, so a clash fails the run instead of shipping.
export const W = 640;
export const r1 = (n) => Math.round(n * 10) / 10;
export const textWidth = (s, size) => [...s].length * size * 0.6;
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export class Chart {
  constructor(id) {
    this.id = id;
    this.defs = [];
    this.parts = [];
    this.boxes = [];
  }

  add(markup) {
    this.parts.push(markup);
  }

  text(x, y, str, { size = 12, anchor = 'start', muted = false, bold = false } = {}) {
    const w = textWidth(str, size);
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    this.boxes.push({ str, x0, x1: x0 + w, y0: y - size * 0.8, y1: y + size * 0.2 });
    const extra = `${anchor === 'start' ? '' : ` text-anchor="${anchor}"`}${muted ? ' opacity="0.65"' : ''}${bold ? ' font-weight="600"' : ''}`;
    this.add(`<text x="${r1(x)}" y="${r1(y)}" font-size="${size}"${extra}>${esc(str)}</text>`);
  }

  hairline(x1, y1, x2, y2, opacity = 0.15) {
    this.add(
      `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="currentColor" stroke-opacity="${opacity}" vector-effect="non-scaling-stroke"/>`,
    );
  }

  // Bar with a rounded data end and a square base; dir -1 grows up, 1 grows down, 0 grows right.
  bar(x, y, w, h, dir, fill, opacity = 1) {
    if (w <= 0 || h <= 0) return;
    const r = Math.min(3, w / 2, h);
    const o = opacity === 1 ? '' : ` fill-opacity="${opacity}"`;
    let d;
    if (dir === -1) d = `M${r1(x)} ${r1(y + h)}V${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)}V${r1(y + h)}Z`;
    else if (dir === 1) d = `M${r1(x)} ${r1(y)}V${r1(y + h - r)}Q${r1(x)} ${r1(y + h)} ${r1(x + r)} ${r1(y + h)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y + h)} ${r1(x + w)} ${r1(y + h - r)}V${r1(y)}Z`;
    else d = `M${r1(x)} ${r1(y)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)}V${r1(y + h - r)}Q${r1(x + w)} ${r1(y + h)} ${r1(x + w - r)} ${r1(y + h)}H${r1(x)}Z`;
    this.add(`<path d="${d}" fill="${fill}"${o}/>`);
  }

  circle(cx, cy, r, fill, stroke = 'none') {
    this.add(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
  }

  // The line is an obstacle for text, like a label.
  dashed(x1, x2, y) {
    this.boxes.push({ str: 'dashed line', x0: x1, x1: x2, y0: y - 2, y1: y + 2 });
    this.add(
      `<line x1="${r1(x1)}" y1="${r1(y)}" x2="${r1(x2)}" y2="${r1(y)}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`,
    );
  }

  // A null point breaks the line; a lone point is drawn as a dot.
  line(points, stroke) {
    const runs = [[]];
    for (const p of points) {
      if (p) runs.at(-1).push(p);
      else runs.push([]);
    }
    const d = runs
      .filter((run) => run.length)
      .map((run) => (run.length === 1 ? `M${r1(run[0][0])} ${r1(run[0][1])}h0` : run.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('')))
      .join('');
    this.add(
      `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    );
  }

  render(height, title, desc) {
    for (const b of this.boxes) {
      if (b.x0 < 0 || b.x1 > W || b.y0 < 0 || b.y1 > height) throw new Error(`${this.id}: "${b.str}" leaves the viewBox`);
    }
    this.boxes.forEach((a, i) => {
      for (const b of this.boxes.slice(i + 1)) {
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) throw new Error(`${this.id}: "${a.str}" overlaps "${b.str}"`);
      }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="100%" role="img" aria-labelledby="${this.id}-title ${this.id}-desc" font-family="inherit" font-size="12" fill="currentColor">
<title id="${this.id}-title">${esc(title)}</title>
<desc id="${this.id}-desc">${esc(desc)}</desc>
${this.defs.length ? `<defs>${this.defs.join('')}</defs>\n` : ''}${this.parts.join('\n')}
</svg>
`;
  }
}
