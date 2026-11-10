// Interface text, one block per language, and the helpers that use it.
// No DOM access at import time, so the tests can import this file in Node.

export const TEXT = {
  ru: {
    title: "Практика слов",
    tabPractice: "Практика",
    tabAdd: "Добавить",
    tabStats: "Прогресс",
    labelKey: "Вход",
    enterKey: "Введите ваш API-ключ, чтобы начать.",
    keyPlaceholder: "API-ключ",
    start: "Начать",
    labelWord: "Слово",
    showMeaning: "Показать значение",
    labelDefinition: "Определение (англ.)",
    labelTranslation: "Перевод",
    labelPractice: "Практика",
    sentencePlaceholder: "Необязательно: составьте предложение с этим словом",
    checkSentence: "Проверить предложение",
    checking: "Проверяю…",
    tryThis: "Лучше так:",
    labelRating: "Насколько хорошо вы помните это слово?",
    forgot: "Совсем не помню",
    hard: "Трудно",
    good: "Хорошо",
    easy: "Знаю",
    wordsLeft: "Осталось слов: {n}",
    nothingDue: "На сегодня всё — возвращайтесь завтра или сохраните новые слова!",
    noDefinition: "Определение не сохранено.",
    noTranslation: "Перевод не сохранён.",
    loadFailed: "Не удалось загрузить. Проверьте соединение и попробуйте ещё раз.",

    addIntro: "Встретили слово в разговоре, фильме или на улице? Добавьте его сюда — оно попадёт в повторение.",
    labelNewWord: "Новое слово",
    fieldWord: "Слово или выражение",
    fieldContext: "Где встретили (предложение)",
    fieldDefinition: "Определение",
    fieldTranslation: "Перевод",
    fieldSource: "Источник",
    optional: "(необязательно)",
    optionalAuto: "(пусто — заполнит ИИ)",
    contextPlaceholder: "Предложение помогает подобрать правильное значение",
    sourcePlaceholder: "например, подкаст, сериал, разговор",
    saveWord: "Сохранить слово",
    saving: "Сохраняю…",
    saved: "Сохранено: {word}",
    wordRequired: "Введите слово.",
    labelRecent: "Недавно добавленные",
    noWords: "Пока нет слов.",
    deleteWord: "Удалить",
    confirmDelete: "Удалить «{word}»? Историю повторений не вернуть.",

    rangeLabel: "Период",
    range7: "Неделя",
    range30: "Месяц",
    range90: "3 месяца",
    tileWords: "Всего слов",
    tileDue: "К повторению",
    tileToday: "Сегодня",
    tileStreak: "Дней подряд",
    tileRetention: "Помню",
    chartReviews: "Повторения",
    chartReviewsSub: "{n} за период",
    chartForecast: "Прогноз",
    chartForecastSub: "Сколько слов придётся повторить в ближайшие дни",
    chartAdded: "Новые слова",
    chartAddedSub: "{n} за период",
    chartCounts: "Состояние слов",
    stageNew: "Новые",
    stageYoung: "Изучаемые",
    stageMature: "Выученные",
    showTable: "Показать таблицей",
    colDate: "Дата",
    colCount: "Слов",
    total: "Всего",
    statsEmpty: "Здесь появится ваш прогресс, когда вы сохраните и повторите первые слова.",
  },
  en: {
    title: "Word practice",
    tabPractice: "Practice",
    tabAdd: "Add word",
    tabStats: "Progress",
    labelKey: "Sign in",
    enterKey: "Enter your API key to start.",
    keyPlaceholder: "API key",
    start: "Start",
    labelWord: "Word",
    showMeaning: "Show meaning",
    labelDefinition: "Definition",
    labelTranslation: "Translation (Russian)",
    labelPractice: "Practice",
    sentencePlaceholder: "Optional: use the word in your own sentence",
    checkSentence: "Check my sentence",
    checking: "Checking…",
    tryThis: "Try:",
    labelRating: "How well did you remember it?",
    forgot: "Completely forgot",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    wordsLeft: "Words left: {n}",
    nothingDue: "Nothing due — come back tomorrow, or save some new words!",
    noDefinition: "No definition saved.",
    noTranslation: "No translation saved.",
    loadFailed: "Couldn't load. Check your connection and try again.",

    addIntro: "Heard a new word in a conversation, a film or on a sign? Add it here and it joins your reviews.",
    labelNewWord: "New word",
    fieldWord: "Word or phrase",
    fieldContext: "Where you met it (sentence)",
    fieldDefinition: "Definition",
    fieldTranslation: "Russian translation",
    fieldSource: "Source",
    optional: "(optional)",
    optionalAuto: "(leave empty for AI)",
    contextPlaceholder: "A sentence helps pick the right meaning",
    sourcePlaceholder: "e.g. podcast, TV show, conversation",
    saveWord: "Save word",
    saving: "Saving…",
    saved: "Saved: {word}",
    wordRequired: "Enter a word.",
    labelRecent: "Recently added",
    noWords: "No words yet.",
    deleteWord: "Delete",
    confirmDelete: "Delete “{word}”? Its review history can't be recovered.",

    rangeLabel: "Range",
    range7: "Week",
    range30: "Month",
    range90: "3 months",
    tileWords: "Words",
    tileDue: "Due today",
    tileToday: "Reviewed today",
    tileStreak: "Day streak",
    tileRetention: "Retention",
    chartReviews: "Reviews",
    chartReviewsSub: "{n} in this range",
    chartForecast: "Future due",
    chartForecastSub: "Words you'll need to review in the coming days",
    chartAdded: "Words added",
    chartAddedSub: "{n} in this range",
    chartCounts: "Card counts",
    stageNew: "New",
    stageYoung: "Learning",
    stageMature: "Mature",
    showTable: "Show as table",
    colDate: "Date",
    colCount: "Words",
    total: "Total",
    statsEmpty: "Your progress will show here once you save and review your first words.",
  },
};

export const LANGUAGES = Object.keys(TEXT);

let lang = "ru"; // Russian by default

export function getLang() {
  return lang;
}

export function setLang(newLang) {
  if (LANGUAGES.includes(newLang)) lang = newLang;
  return lang;
}

// Looks up a piece of text in the current language.
// Falls back to English, then to the key itself, so a missing
// translation shows something instead of "undefined".
export function t(key, values = {}, language = lang) {
  let text = TEXT[language]?.[key] ?? TEXT.en[key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

// "2026-11-10" -> "10 Nov" / "10 нояб." in the current language.
export function formatDay(isoDay, options = { day: "numeric", month: "short" }, language = lang) {
  const date = new Date(`${isoDay}T00:00:00Z`);
  return new Intl.DateTimeFormat(language, { ...options, timeZone: "UTC" }).format(date);
}
