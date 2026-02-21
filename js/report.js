export function getWeekRange(today = new Date()) {
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(today);
  start.setDate(today.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateTotals(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.english += row.english_chapters_completed || 0;
      totals.urdu += row.urdu_items_completed || 0;
      totals.pakStudies += row.pakstudies_pages_completed || 0;
      totals.quran += row.quran_surahs_completed || 0;
      totals.essays += row.essay_completed ? 1 : 0;
      return totals;
    },
    { english: 0, urdu: 0, pakStudies: 0, quran: 0, essays: 0 }
  );
}

export function getInsightMessage(totals) {
  const combinedTotal = totals.english + totals.urdu + totals.pakStudies + totals.quran;

  if (combinedTotal > 25) return "Great consistency this week. Keep it up.";
  if (totals.pakStudies < 5) return "Increase Pak Studies focus this week.";
  if (totals.essays >= 2) return "Essay practice is on track.";
  return "Good start. Aim for steady progress every day.";
}
