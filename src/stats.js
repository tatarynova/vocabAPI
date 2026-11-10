// Progress statistics for the stats page, in the spirit of Anki's "Statistics" screen.
// Pure functions: everything they need is passed in, so they are easy to test.

export const MATURE_DAYS = 21; // Anki calls a card "mature" once its interval reaches 21 days
const DAY_MS = 24 * 60 * 60 * 1000;

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; turn it into milliseconds.
export function parseDbDate(text) {
  return Date.parse(`${String(text).replace(' ', 'T')}Z`);
}

// The calendar day (YYYY-MM-DD) a moment falls on for the user.
// tzOffsetMinutes is what the browser's Date#getTimezoneOffset() returns
// (UTC minus local time, e.g. -180 for Moscow).
export function localDay(ms, tzOffsetMinutes = 0) {
  return new Date(ms - tzOffsetMinutes * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

// new: never successfully reviewed yet; young: interval under 21 days; mature: 21+ days.
export function cardStage(word) {
  const interval = Number(word.interval_days) || 0;
  if (interval === 0) return 'new';
  return interval >= MATURE_DAYS ? 'mature' : 'young';
}

// Days in a row, ending today, with at least one review. If nothing has been
// reviewed yet today the streak still counts up to yesterday, so it doesn't
// drop to zero every morning.
export function reviewStreak(reviewDays, today) {
  const set = new Set(reviewDays);
  let day = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

const GRADE_NAMES = ['forgot', 'hard', 'good', 'easy'];

export function computeStats({ words = [], reviews = [], now = Date.now(), tzOffsetMinutes = 0, days = 30 }) {
  const today = localDay(now, tzOffsetMinutes);
  const firstDay = addDays(today, -(days - 1));
  const lastForecastDay = addDays(today, days - 1);
  const dayOf = (text) => localDay(parseDbDate(text), tzOffsetMinutes);

  // Empty buckets first, so days without activity still show as zero.
  const reviewsByDay = new Map();
  const addedByDay = new Map();
  const forecastByDay = new Map();
  for (let i = 0; i < days; i++) {
    const past = addDays(firstDay, i);
    reviewsByDay.set(past, { date: past, forgot: 0, hard: 0, good: 0, easy: 0 });
    addedByDay.set(past, { date: past, count: 0 });
    const future = addDays(today, i);
    forecastByDay.set(future, { date: future, count: 0 });
  }

  const counts = { new: 0, young: 0, mature: 0 };
  let dueToday = 0;
  for (const w of words) {
    counts[cardStage(w)] += 1;

    const added = addedByDay.get(dayOf(w.created_at));
    if (added) added.count += 1;

    let due = dayOf(w.due_at);
    if (due < today) due = today; // overdue words are due today
    if (due === today) dueToday += 1;
    if (due <= lastForecastDay) forecastByDay.get(due).count += 1;
  }

  const allReviewDays = [];
  let inRange = 0;
  let remembered = 0;
  let reviewsToday = 0;
  for (const r of reviews) {
    const day = dayOf(r.reviewed_at);
    allReviewDays.push(day);
    if (day === today) reviewsToday += 1;
    const bucket = reviewsByDay.get(day);
    const name = GRADE_NAMES[Number(r.grade)];
    if (!bucket || !name) continue;
    bucket[name] += 1;
    inRange += 1;
    if (Number(r.grade) > 0) remembered += 1;
  }

  return {
    days,
    today,
    totals: {
      words: words.length,
      ...counts,
      dueToday,
      reviewsToday,
      reviewsInRange: inRange,
      retention: inRange ? Math.round((remembered / inRange) * 100) : null,
      streak: reviewStreak(allReviewDays, today),
    },
    reviews: [...reviewsByDay.values()],
    added: [...addedByDay.values()],
    forecast: [...forecastByDay.values()],
  };
}
