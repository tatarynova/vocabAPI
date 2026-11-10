// Practice tab: shows the words due today, one at a time.
import { api } from "./api.js";
import { t, getLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);

let queue = [];
let current = null;
let loaded = false;
let failed = false;
let lastFeedback = null;

// The text under the "Show meaning" button for a sentence check.
export function feedbackText(feedback, translate = t) {
  if (!feedback) return "";
  if (feedback === "checking") return translate("checking");
  const { out, sentence } = feedback;
  if (out.error) return out.error;
  const better = out.better && out.better !== sentence ? ` ${translate("tryThis")} “${out.better}”` : "";
  return `${out.correct ? "✅" : "✏️"} ${out.feedback}${better}`;
}

function renderStatus() {
  const status = $("status");
  if (failed) status.textContent = t("loadFailed");
  else if (!loaded) status.textContent = "";
  else if (!current) status.textContent = t("nothingDue");
  else status.textContent = t("wordsLeft", { n: queue.length + 1 });
}

function fill(id, value, emptyKey) {
  const el = $(id);
  el.textContent = value || t(emptyKey);
  el.classList.toggle("empty", !value);
}

// Definition and translation, or a grey "not saved" note.
function renderMeaning() {
  if (!current) return;
  fill("definition", current.definition, "noDefinition");
  fill("translation", current.translation_ru, "noTranslation");
}

function renderFeedback() {
  $("feedback").textContent = feedbackText(lastFeedback);
}

export function renderPractice() {
  renderStatus();
  renderMeaning();
  renderFeedback();
}

function next() {
  current = queue.shift();
  lastFeedback = null;
  renderStatus();
  $("practice").classList.toggle("hidden", !current);
  if (!current) return;
  $("word").textContent = current.word;
  $("context").textContent = current.context ? `“${current.context}”` : "";
  renderMeaning();
  renderFeedback();
  $("answer").classList.add("hidden");
  $("revealBtn").classList.remove("hidden");
  $("mySentence").value = "";
}

export async function loadPractice() {
  try {
    queue = await api("/review");
    loaded = true;
    failed = false;
  } catch (err) {
    if (err.status === 401) return;
    failed = true;
  }
  next();
}

function reveal() {
  $("answer").classList.remove("hidden");
  $("revealBtn").classList.add("hidden");
}

async function grade(g) {
  if (!current) return;
  await api(`/review/${current.id}`, { method: "POST", body: { grade: g } });
  next();
}

async function check() {
  const sentence = $("mySentence").value.trim();
  if (!sentence || !current) return;
  lastFeedback = "checking";
  renderFeedback();
  let out;
  try {
    out = await api(`/check/${current.id}`, { method: "POST", body: { sentence, lang: getLang() } });
  } catch (err) {
    out = { error: err.message };
  }
  lastFeedback = { out, sentence };
  renderFeedback();
}

export function initPractice() {
  $("revealBtn").addEventListener("click", reveal);
  $("checkBtn").addEventListener("click", check);
  document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.addEventListener("click", () => grade(Number(btn.dataset.grade)).catch(() => {}));
  });
}
