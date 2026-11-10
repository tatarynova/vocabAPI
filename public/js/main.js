// Entry point: language, tabs and the API-key screen; each tab lives in its own module.
import { t, getLang, setLang } from "./i18n.js";
import { setApiKey, whenUnauthorized } from "./api.js";
import { storage } from "./storage.js";
import { initPractice, loadPractice, renderPractice } from "./practice.js";
import { initAddWord, loadRecent, renderAddWord } from "./add-word.js";
import { initStats, loadStats, renderStats } from "./stats.js";

const TABS = {
  practice: { load: loadPractice, render: renderPractice },
  add: { load: loadRecent, render: renderAddWord },
  stats: { load: loadStats, render: renderStats },
};

let tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : "practice";

// Fills every element marked with data-i18n, then redraws the parts built in code.
function applyLanguage() {
  document.documentElement.lang = getLang();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.lang === getLang());
  });
  for (const view of Object.values(TABS)) view.render();
}

function showTab(name) {
  tab = name;
  history.replaceState(null, "", `#${name}`);
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.setAttribute("aria-selected", btn.dataset.tab === name);
  });
  for (const key of Object.keys(TABS)) {
    document.getElementById(`view-${key}`).classList.toggle("hidden", key !== name);
  }
  TABS[name].load();
}

function showSetup() {
  document.getElementById("setup").classList.remove("hidden");
  for (const key of Object.keys(TABS)) document.getElementById(`view-${key}`).classList.add("hidden");
}

function init() {
  setLang(storage.get("vocabLang") || "ru");

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      storage.set("vocabLang", setLang(btn.dataset.lang));
      applyLanguage();
    });
  });
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
  document.getElementById("keyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    setApiKey(document.getElementById("keyInput").value.trim());
    document.getElementById("setup").classList.add("hidden");
    showTab(tab);
  });
  whenUnauthorized(showSetup);

  initPractice();
  initAddWord();
  initStats();

  applyLanguage();
  showTab(tab);
}

init();
