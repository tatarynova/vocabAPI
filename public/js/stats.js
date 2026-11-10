// Progress tab: Anki-style statistics — summary tiles, reviews per day,
// future due forecast, words added per day and card counts.
import { api } from "./api.js";
import { t, formatDay } from "./i18n.js";
import { storage } from "./storage.js";
import { drawBarChart, drawSegmentedBar } from "./charts.js";

const $ = (id) => document.getElementById(id);

let days = Number(storage.get("vocabStatsDays")) || 30;
let stats = null;
let failed = false;

const GRADE_SERIES = [
  { key: "forgot", color: "var(--c-forgot)" },
  { key: "hard", color: "var(--c-hard)" },
  { key: "good", color: "var(--c-good)" },
  { key: "easy", color: "var(--c-easy)" },
];

// Tile values, ready to print. Retention is blank until there are reviews.
export function tileValues(totals) {
  return [
    ["tileWords", totals.words],
    ["tileDue", totals.dueToday],
    ["tileToday", totals.reviewsToday],
    ["tileStreak", totals.streak],
    ["tileRetention", totals.retention === null ? "—" : `${totals.retention}%`],
  ];
}

function renderTiles() {
  $("tiles").replaceChildren(
    ...tileValues(stats.totals).map(([key, value]) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      const label = document.createElement("p");
      label.className = "tile-label";
      label.textContent = t(key);
      const number = document.createElement("p");
      number.className = "tile-value";
      number.textContent = typeof value === "number" ? new Intl.NumberFormat().format(value) : value;
      tile.append(label, number);
      return tile;
    })
  );
}

function renderCharts() {
  const tableLabels = { date: t("colDate"), total: t("total"), show: t("showTable") };
  const xLabel = (d) => formatDay(d.date, days > 7 ? undefined : { weekday: "short" });
  const title = (d) => formatDay(d.date, { weekday: "short", day: "numeric", month: "short" });

  drawBarChart($("chartReviews"), {
    data: stats.reviews,
    series: GRADE_SERIES.map((s) => ({ ...s, label: t(s.key) })),
    xLabel,
    title,
    ariaLabel: t("chartReviews"),
    tableLabels,
  });
  $("reviewsSub").textContent = t("chartReviewsSub", { n: stats.totals.reviewsInRange });

  drawBarChart($("chartForecast"), {
    data: stats.forecast,
    series: [{ key: "count", label: t("colCount"), color: "var(--c-bar)" }],
    xLabel,
    title,
    ariaLabel: t("chartForecast"),
    tableLabels,
  });
  $("forecastSub").textContent = t("chartForecastSub");

  const addedTotal = stats.added.reduce((sum, d) => sum + d.count, 0);
  drawBarChart($("chartAdded"), {
    data: stats.added,
    series: [{ key: "count", label: t("colCount"), color: "var(--c-bar)" }],
    xLabel,
    title,
    ariaLabel: t("chartAdded"),
    tableLabels,
  });
  $("addedSub").textContent = t("chartAddedSub", { n: addedTotal });

  drawSegmentedBar($("chartCounts"), [
    { label: t("stageNew"), value: stats.totals.new, color: "var(--c-new)" },
    { label: t("stageYoung"), value: stats.totals.young, color: "var(--c-young)" },
    { label: t("stageMature"), value: stats.totals.mature, color: "var(--c-mature)" },
  ]);
}

export function renderStats() {
  document.querySelectorAll("[data-days]").forEach((btn) => {
    btn.setAttribute("aria-pressed", Number(btn.dataset.days) === days);
  });
  const status = $("statsStatus");
  const empty = stats && stats.totals.words === 0 && stats.totals.reviewsInRange === 0;
  status.classList.toggle("hidden", !failed && !empty);
  status.textContent = failed ? t("loadFailed") : empty ? t("statsEmpty") : "";
  $("statsBody").classList.toggle("hidden", !stats || failed);
  if (!stats || failed) return;
  renderTiles();
  renderCharts();
}

export async function loadStats() {
  try {
    stats = await api(`/stats?days=${days}&tz=${new Date().getTimezoneOffset()}`);
    failed = false;
  } catch (err) {
    if (err.status === 401) return;
    failed = true;
  }
  renderStats();
}

export function initStats() {
  document.querySelectorAll("[data-days]").forEach((btn) => {
    btn.addEventListener("click", () => {
      days = Number(btn.dataset.days);
      storage.set("vocabStatsDays", String(days));
      loadStats();
    });
  });
}
