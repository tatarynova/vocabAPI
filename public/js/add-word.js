// "Add word" tab: save words met outside the reading apps (talk, films, signs…).
import { api } from "./api.js";
import { t } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const RECENT_COUNT = 8;

let recent = [];
let message = null; // { key, values, error }

// Form fields -> request body. Empty optional fields are left out so the
// server fills them in with the AI / dictionary.
export function buildWordPayload(fields) {
  const body = { word: (fields.word ?? "").trim(), source: (fields.source ?? "").trim() || "manual" };
  for (const name of ["context", "definition", "translation"]) {
    const value = (fields[name] ?? "").trim();
    if (value) body[name] = value;
  }
  return body;
}

function renderMessage() {
  const el = $("addMessage");
  el.classList.toggle("error", Boolean(message?.error));
  if (!message) el.textContent = "";
  else if (message.raw) el.textContent = message.raw;
  else el.textContent = t(message.key, message.values);
}

function renderRecent() {
  const list = $("recentList");
  list.replaceChildren();
  if (!recent.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = t("noWords");
    list.append(li);
    return;
  }
  for (const w of recent) {
    const li = document.createElement("li");
    const word = document.createElement("span");
    word.className = "r-word";
    word.textContent = w.word;
    const meaning = document.createElement("span");
    meaning.className = "r-meaning";
    meaning.textContent = w.translation_ru || w.definition || "";
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = t("deleteWord");
    del.setAttribute("aria-label", `${t("deleteWord")} ${w.word}`);
    del.addEventListener("click", () => remove(w));
    li.append(word, meaning, del);
    list.append(li);
  }
}

export function renderAddWord() {
  renderMessage();
  renderRecent();
}

export async function loadRecent() {
  try {
    const words = await api("/words");
    recent = words.slice(0, RECENT_COUNT);
  } catch {
    recent = [];
  }
  renderRecent();
}

async function remove(w) {
  if (!confirm(t("confirmDelete", { word: w.word }))) return;
  await api(`/words/${w.id}`, { method: "DELETE" }).catch(() => {});
  await loadRecent();
}

async function submit(event) {
  event.preventDefault();
  const body = buildWordPayload({
    word: $("addWord").value,
    context: $("addContext").value,
    definition: $("addDefinition").value,
    translation: $("addTranslation").value,
    source: $("addSource").value,
  });
  if (!body.word) {
    message = { key: "wordRequired", error: true };
    renderMessage();
    $("addWord").focus();
    return;
  }

  const button = $("addBtn");
  button.disabled = true;
  message = { key: "saving" };
  renderMessage();
  try {
    const saved = await api("/words", { method: "POST", body });
    message = { key: "saved", values: { word: saved.word } };
    $("addForm").reset();
    $("addWord").focus();
    await loadRecent();
  } catch (err) {
    message = { raw: err.message, error: true };
  } finally {
    button.disabled = false;
    renderMessage();
  }
}

export function initAddWord() {
  $("addForm").addEventListener("submit", submit);
}
