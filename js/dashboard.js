import { supabase } from "./supabaseClient.js";
import { requireAuth, logout } from "./auth.js";
import { getFormPayload, saveProgress } from "./form.js";
import { calculateTotals, getInsightMessage, getWeekRange, toISODate } from "./report.js";

let weeklyChart;

function renderSummaryCards(totals) {
  document.getElementById("englishTotal").textContent = totals.english;
  document.getElementById("urduTotal").textContent = totals.urdu;
  document.getElementById("pakTotal").textContent = totals.pakStudies;
  document.getElementById("quranTotal").textContent = totals.quran;
  document.getElementById("essayTotal").textContent = totals.essays;
  document.getElementById("insightMessage").textContent = getInsightMessage(totals);
}

function renderHistory(rows) {
  const body = document.getElementById("historyTableBody");
  body.innerHTML = "";

  if (!rows.length) {
    body.innerHTML = "<tr><td colspan='7' class='py-4 text-slate-500'>No entries yet.</td></tr>";
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.date}</td>
      <td class="py-2 pr-4">${row.english_chapters_completed}</td>
      <td class="py-2 pr-4">${row.urdu_items_completed}</td>
      <td class="py-2 pr-4">${row.pakstudies_pages_completed}</td>
      <td class="py-2 pr-4">${row.quran_surahs_completed}</td>
      <td class="py-2 pr-4">${row.essay_completed ? "Yes" : "No"}</td>
      <td class="py-2 pr-4">${row.notes || "-"}</td>
    `;
    body.appendChild(tr);
  });
}

function renderWeeklyChart(totals) {
  const canvas = document.getElementById("weeklyChart");
  if (!canvas) return;

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  weeklyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["English", "Urdu", "Pak Studies", "Quran", "Essays"],
      datasets: [
        {
          label: "Weekly Totals",
          data: [totals.english, totals.urdu, totals.pakStudies, totals.quran, totals.essays],
          backgroundColor: ["#1e293b", "#059669", "#0ea5e9", "#f59e0b", "#7c3aed"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

async function fetchEntriesForCurrentWeek() {
  const { start, end } = getWeekRange(new Date());
  const from = toISODate(start);
  const to = toISODate(end);

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await supabase
    .from("daily_progress")
    .select("date, english_chapters_completed, urdu_items_completed, pakstudies_pages_completed, quran_surahs_completed, essay_completed, notes")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchAllEntries() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await supabase
    .from("daily_progress")
    .select("date, english_chapters_completed, urdu_items_completed, pakstudies_pages_completed, quran_surahs_completed, essay_completed, notes")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function loadDashboard() {
  const weeklyRows = await fetchEntriesForCurrentWeek();
  const allRows = await fetchAllEntries();
  const totals = calculateTotals(weeklyRows);

  renderSummaryCards(totals);
  renderWeeklyChart(totals);
  renderHistory(allRows);
}

function setFormMessage(message, isError = false) {
  const messageEl = document.getElementById("formMessage");
  messageEl.textContent = message;
  messageEl.className = isError ? "text-sm text-red-600" : "text-sm text-emerald-600";
}

function setupForm() {
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = toISODate(new Date());

  const form = document.getElementById("progressForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = getFormPayload();
      await saveProgress(payload);
      setFormMessage("Progress saved successfully.");
      form.reset();
      if (dateInput) dateInput.value = toISODate(new Date());
      await loadDashboard();
    } catch (error) {
      setFormMessage(error.message || "Failed to save progress.", true);
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", logout);
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  setupForm();
  setupLogout();

  try {
    await loadDashboard();
  } catch (error) {
    setFormMessage(error.message || "Failed to load dashboard.", true);
  }
}

init();
