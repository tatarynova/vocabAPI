// spaced repetionion functionality
export function schedule(card, grade) {
  let { ease, interval_days: interval, repetitions } = card;

  if (grade === 0) {
    repetitions = 0;          // forgot: back to the start
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === 1) interval = Math.max(1, Math.round(interval * 0.6)); // hard
  }

  const change = { 0: -0.2, 1: -0.15, 2: 0, 3: 0.15 }[grade];
  ease = Math.max(1.3, ease + change);

  const due = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  return {
    ease,
    interval_days: interval,
    repetitions,
    due_at: due.toISOString().slice(0, 19).replace('T', ' '),
  };
}