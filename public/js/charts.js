// Small SVG bar charts for the Progress tab, with no chart library.
// The layout maths (niceScale, stackLayout) is pure and unit-tested;
// the draw functions turn a layout into SVG + a hover tooltip + a table view.

const SVG_NS = "http://www.w3.org/2000/svg";
export const CHART = { width: 520, height: 180, top: 10, right: 4, bottom: 22, left: 30 };
const MAX_BAR = 24; // bars never get thicker than this
const GAP = 2; // surface gap between neighbouring bars and stacked segments
const RADIUS = 4; // rounded data end

// A y-axis that ends on a round number: max 7 -> 0, 2, 4, 6, 8.
export function niceScale(maxValue, tickCount = 4) {
  if (!(maxValue > 0)) return { max: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = maxValue / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough && s >= 1) ?? 1;
  const max = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(Math.round(v));
  return { max, ticks };
}

// Positions of every bar and stacked segment, in viewBox units.
export function stackLayout(data, keys, box = CHART) {
  const innerW = box.width - box.left - box.right;
  const innerH = box.height - box.top - box.bottom;
  const baseline = box.top + innerH;
  const totals = data.map((d) => keys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0));
  const scale = niceScale(Math.max(0, ...totals));
  const slot = data.length ? innerW / data.length : innerW;
  const barW = Math.max(1, Math.min(MAX_BAR, slot - GAP));
  const y = (v) => baseline - (v / scale.max) * innerH;

  const bars = data.map((d, i) => {
    const x = box.left + i * slot + (slot - barW) / 2;
    let running = 0;
    const segments = [];
    for (const key of keys) {
      const value = Number(d[key]) || 0;
      if (!value) continue;
      const top = y(running + value);
      const bottom = y(running);
      running += value;
      segments.push({ key, value, y: top, h: bottom - top });
    }
    // Leave a surface gap between touching segments (taken from the lower one's top).
    for (let s = 0; s < segments.length - 1; s++) {
      const seg = segments[s];
      const cut = Math.min(GAP, Math.max(0, seg.h - 1));
      seg.y += cut;
      seg.h -= cut;
    }
    return { x, w: barW, slotX: box.left + i * slot, slotW: slot, total: totals[i], segments, datum: d };
  });

  return { bars, baseline, ticks: scale.ticks.map((value) => ({ value, y: y(value) })), max: scale.max };
}

// Which x-axis labels to show so they don't collide: about `wanted` of them,
// always including the last (today).
export function labelIndexes(count, wanted = 6) {
  if (count <= 0) return [];
  const every = Math.max(1, Math.ceil(count / wanted));
  const out = [];
  for (let i = count - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}

// A rectangle with only its top corners rounded (square at the baseline).
export function topRoundedRect(x, y, w, h, r = RADIUS) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return (
    `M${x},${y + h}V${y + rr}` +
    `Q${x},${y} ${x + rr},${y}H${x + w - rr}` +
    `Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
  );
}

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

function html(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function swatch(color) {
  const s = html("span", { className: "swatch" });
  s.style.background = color;
  return s;
}

const fmt = (n) => new Intl.NumberFormat().format(n);

/**
 * Draws a (stacked) column chart into `container`.
 * series: [{ key, label, color }] in stacking order, bottom first.
 * xLabel(datum) -> short axis label; title(datum) -> tooltip heading.
 */
export function drawBarChart(container, { data, series, xLabel, title, ariaLabel, tableLabels }) {
  const keys = series.map((s) => s.key);
  const layout = stackLayout(data, keys);
  container.replaceChildren();

  const svg = el("svg", {
    viewBox: `0 0 ${CHART.width} ${CHART.height}`,
    role: "img",
    "aria-label": ariaLabel,
  });

  const grid = el("g", { class: "grid" }, svg);
  // The SVG scales with the page, so pick a font size that ends up ~11px on screen.
  const shrink = CHART.width / (container.clientWidth || CHART.width);
  const axis = el("g", { class: "axis", style: `font-size: ${Math.min(16, 11 * shrink).toFixed(1)}px` }, svg);
  for (const tick of layout.ticks) {
    if (tick.value > 0) el("line", { x1: CHART.left, x2: CHART.width - CHART.right, y1: tick.y, y2: tick.y }, grid);
    const label = el("text", { x: CHART.left - 6, y: tick.y + 3, "text-anchor": "end" }, axis);
    label.textContent = fmt(tick.value);
  }
  el("line", { class: "baseline", x1: CHART.left, x2: CHART.width - CHART.right, y1: layout.baseline, y2: layout.baseline }, svg);

  for (const i of labelIndexes(data.length)) {
    const bar = layout.bars[i];
    const label = el("text", { x: bar.slotX + bar.slotW / 2, y: CHART.height - 6, "text-anchor": "middle" }, axis);
    label.textContent = xLabel(bar.datum);
  }

  const colorOf = Object.fromEntries(series.map((s) => [s.key, s.color]));
  const marks = el("g", {}, svg);
  for (const bar of layout.bars) {
    bar.segments.forEach((seg, s) => {
      const isTop = s === bar.segments.length - 1;
      const d = isTop
        ? topRoundedRect(bar.x, seg.y, bar.w, seg.h)
        : `M${bar.x},${seg.y}h${bar.w}v${seg.h}h${-bar.w}Z`;
      el("path", { d, style: `fill: ${colorOf[seg.key]}` }, marks); // style, so CSS variables work
    });
  }

  // Hover / tap targets: the whole column slot, bigger than the bar itself.
  const tooltip = html("div", { className: "tooltip hidden", role: "status" });
  const hits = el("g", {}, svg);
  let active = null;
  const hide = () => {
    tooltip.classList.add("hidden");
    active?.classList.remove("active");
    active = null;
  };
  layout.bars.forEach((bar) => {
    const hit = el("rect", { class: "hit", x: bar.slotX, y: CHART.top, width: bar.slotW, height: layout.baseline - CHART.top }, hits);
    const show = () => {
      active?.classList.remove("active");
      active = hit;
      hit.classList.add("active");
      const rows = series.map((s) =>
        html("div", { className: "row" }, [swatch(s.color), html("span", { textContent: s.label }), html("span", { textContent: fmt(Number(bar.datum[s.key]) || 0) })])
      );
      if (series.length > 1) {
        rows.push(html("div", { className: "row" }, [html("span", { textContent: tableLabels.total }), html("span", { textContent: fmt(bar.total) })]));
      }
      tooltip.replaceChildren(html("strong", { textContent: title(bar.datum) }), ...rows);
      tooltip.classList.remove("hidden");
      // Above the bar if it fits; otherwise beside it, so it never hides the bar.
      const scale = container.clientWidth / CHART.width;
      const width = tooltip.offsetWidth;
      const above = (bar.segments.at(-1)?.y ?? layout.baseline) * scale - tooltip.offsetHeight - 8;
      let left;
      if (above >= 0) {
        const centre = (bar.slotX + bar.slotW / 2) * scale;
        left = Math.min(Math.max(0, centre - width / 2), container.clientWidth - width);
      } else {
        const right = (bar.slotX + bar.slotW) * scale + 8;
        left = right + width <= container.clientWidth ? right : bar.slotX * scale - width - 8;
      }
      tooltip.style.left = `${Math.max(0, left)}px`;
      tooltip.style.top = `${Math.max(0, above)}px`;
    };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("click", show);
  });
  // A mouse hides the tooltip on leaving the chart. A finger "leaves" as soon as it
  // lifts, so on touch the tooltip stays until you tap somewhere else.
  svg.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") hide();
  });
  container._stopListening?.abort();
  container._stopListening = new AbortController();
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!svg.contains(e.target)) hide();
    },
    { signal: container._stopListening.signal }
  );

  container.append(svg, tooltip);

  if (series.length > 1) {
    container.append(
      html(
        "ul",
        { className: "legend" },
        series.map((s) => html("li", {}, [swatch(s.color), html("span", { textContent: s.label })]))
      )
    );
  }
  container.append(tableView(data, series, title, tableLabels));
}

// The same numbers as a table, for screen readers and exact values.
function tableView(data, series, title, labels) {
  const head = html("tr", {}, [
    html("th", { textContent: labels.date }),
    ...series.map((s) => html("th", { textContent: s.label })),
  ]);
  const rows = data.map((d) =>
    html("tr", {}, [html("td", { textContent: title(d) }), ...series.map((s) => html("td", { textContent: fmt(Number(d[s.key]) || 0) }))])
  );
  return html("details", { className: "table-view" }, [
    html("summary", { textContent: labels.show }),
    html("table", {}, [html("thead", {}, [head]), html("tbody", {}, rows)]),
  ]);
}

// One whole split into parts (new / learning / mature), with counts in the legend.
export function drawSegmentedBar(container, parts) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const bar = html("div", { className: "segbar", role: "img" });
  bar.setAttribute("aria-label", parts.map((p) => `${p.label}: ${p.value}`).join(", "));
  for (const p of parts) {
    if (!p.value) continue;
    const seg = html("div");
    seg.style.flex = `${p.value} 1 0`;
    seg.style.background = p.color;
    bar.append(seg);
  }
  const legend = html(
    "ul",
    { className: "legend" },
    parts.map((p) =>
      html("li", {}, [
        swatch(p.color),
        html("span", { textContent: p.label }),
        html("span", { className: "count", textContent: fmt(p.value) }),
        html("span", { textContent: total ? `(${Math.round((p.value / total) * 100)}%)` : "" }),
      ])
    )
  );
  container.replaceChildren(bar, legend);
}
