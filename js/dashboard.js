import { supabase } from "./supabaseClient.js";
import { requireAuth, logout } from "./auth.js";
import { getFormPayload, saveProgress } from "./form.js";
import { calculateTotals, getInsightMessage, getWeekRange, toISODate } from "./report.js";

let weeklyChart;
let historyEntries = [];

function renderSummaryCards(totals) {
  document.getElementById("englishTotal").textContent = totals.english;
  document.getElementById("urduTotal").textContent = totals.urdu;
  document.getElementById("pakTotal").textContent = totals.pakStudies;
  document.getElementById("quranTotal").textContent = totals.quran;
  document.getElementById("essayTotal").textContent = totals.essays;
  document.getElementById("revisionSessionTotal").textContent = totals.revisionSessions || 0;
  document.getElementById("insightMessage").textContent = getInsightMessage(totals);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHistory(rows) {
  const body = document.getElementById("historyTableBody");
  body.innerHTML = "";

  if (!rows.length) {
    body.innerHTML = "<tr><td colspan='8' class='py-4 text-slate-500'>No entries yet.</td></tr>";
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-2 pr-4">${escapeHtml(row.date)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.english_chapters_completed)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.urdu_items_completed)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.pakstudies_pages_completed)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.quran_surahs_completed)}</td>
      <td class="py-2 pr-4">${row.essay_completed ? "Yes" : "No"}</td>
      <td class="py-2 pr-4">${escapeHtml(row.notes || "-")}</td>
      <td class="py-2 pr-4">
        <button data-edit-id="${escapeHtml(row.id)}" class="px-2 py-1 text-xs rounded-md border border-slate-300 hover:bg-slate-100">Edit</button>
      </td>
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
    .select("id, date, english_chapters_completed, urdu_items_completed, pakstudies_pages_completed, quran_surahs_completed, essay_completed, notes")
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
    .select("id, date, english_chapters_completed, urdu_items_completed, pakstudies_pages_completed, quran_surahs_completed, essay_completed, notes")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchWeeklyRevisionSessionCount() {
  const { start, end } = getWeekRange(new Date());
  const from = toISODate(start);
  const to = toISODate(end);

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await supabase
    .from("quran_revision")
    .select("id")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (error) {
    throw new Error(error.message);
  }

  return data?.length || 0;
}

async function loadDashboard() {
  setDashboardLoading(true);
  try {
    const weeklyRows = await fetchEntriesForCurrentWeek();
    const allRows = await fetchAllEntries();
    const revisionSessions = await fetchWeeklyRevisionSessionCount();
    const totals = calculateTotals(weeklyRows);
    totals.revisionSessions = revisionSessions;
    historyEntries = allRows;

    renderSummaryCards(totals);
    renderWeeklyChart(totals);
    renderHistory(allRows);
  } finally {
    setDashboardLoading(false);
  }
}

function setFormMessage(message, isError = false) {
  const messageEl = document.getElementById("formMessage");
  messageEl.textContent = message;
  messageEl.className = isError ? "text-sm text-red-600" : "text-sm text-emerald-600";
}

function setDashboardLoading(isLoading, message = "Loading dashboard progress...") {
  const loader = document.getElementById("dashboardLoader");
  const loaderText = document.getElementById("dashboardLoaderText");
  const mainSections = document.querySelectorAll("main > section:not(#dashboardLoader)");

  if (!loader) return;
  if (loaderText) loaderText.textContent = message;

  if (isLoading) {
    loader.classList.remove("hidden");
    mainSections.forEach((section) => section.classList.add("opacity-60", "pointer-events-none"));
  } else {
    loader.classList.add("hidden");
    mainSections.forEach((section) => section.classList.remove("opacity-60", "pointer-events-none"));
  }
}

function setLoggedInUserEmail(user) {
  const emailEl = document.getElementById("userEmail");
  if (!emailEl) return;
  emailEl.textContent = user?.email ? `Logged in: ${user.email}` : "Logged in";
}

function setupForm() {
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = toISODate(new Date());

  const form = document.getElementById("progressForm");
  const submitBtn = form?.querySelector("button[type='submit']");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = getFormPayload();
      if (!payload.date) {
        setFormMessage("Please select a date.", true);
        return;
      }
      if ([payload.english, payload.urdu, payload.pakStudies, payload.quran].some((value) => Number.isNaN(value) || value < 0)) {
        setFormMessage("Please enter valid non-negative numbers.", true);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }
      setDashboardLoading(true, "Saving progress...");
      await saveProgress(payload);
      setFormMessage("Progress saved successfully.");
      form.reset();
      if (dateInput) dateInput.value = toISODate(new Date());
      await loadDashboard();
    } catch (error) {
      setFormMessage(error.message || "Failed to save progress.", true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Progress";
      }
    }
  });
}

function openEditModal(entry) {
  const modal = document.getElementById("editModal");
  document.getElementById("editId").value = entry.id;
  document.getElementById("editDate").value = entry.date;
  document.getElementById("editEnglish").value = entry.english_chapters_completed;
  document.getElementById("editUrdu").value = entry.urdu_items_completed;
  document.getElementById("editPakStudies").value = entry.pakstudies_pages_completed;
  document.getElementById("editQuran").value = entry.quran_surahs_completed;
  document.getElementById("editEssay").checked = Boolean(entry.essay_completed);
  document.getElementById("editNotes").value = entry.notes || "";
  document.getElementById("editMessage").textContent = "";
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

function setEditMessage(message, isError = false) {
  const messageEl = document.getElementById("editMessage");
  messageEl.textContent = message;
  messageEl.className = isError ? "text-sm text-red-600" : "text-sm text-emerald-600";
}

async function updateProgressEntry(payload) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { error } = await supabase
    .from("daily_progress")
    .update({
      date: payload.date,
      english_chapters_completed: payload.english,
      urdu_items_completed: payload.urdu,
      pakstudies_pages_completed: payload.pakStudies,
      quran_surahs_completed: payload.quran,
      essay_completed: payload.essay,
      notes: payload.notes,
    })
    .eq("id", payload.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function setupHistoryActions() {
  const body = document.getElementById("historyTableBody");
  body?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-edit-id]");
    if (!button) return;

    const entryId = button.dataset.editId;
    const entry = historyEntries.find((item) => item.id === entryId);
    if (!entry) return;
    openEditModal(entry);
  });
}

function setupEditModal() {
  const closeBtn = document.getElementById("closeEditModalBtn");
  closeBtn?.addEventListener("click", closeEditModal);

  const modal = document.getElementById("editModal");
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditModal();
    }
  });

  const form = document.getElementById("editProgressForm");
  const saveBtn = document.getElementById("saveEditBtn");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      id: document.getElementById("editId").value,
      date: document.getElementById("editDate").value,
      english: Number(document.getElementById("editEnglish").value),
      urdu: Number(document.getElementById("editUrdu").value),
      pakStudies: Number(document.getElementById("editPakStudies").value),
      quran: Number(document.getElementById("editQuran").value),
      essay: document.getElementById("editEssay").checked,
      notes: document.getElementById("editNotes").value.trim() || null,
    };

    if (!payload.id || !payload.date) {
      setEditMessage("Missing entry data. Please reopen edit.", true);
      return;
    }
    if ([payload.english, payload.urdu, payload.pakStudies, payload.quran].some((value) => Number.isNaN(value) || value < 0)) {
      setEditMessage("Please enter valid non-negative numbers.", true);
      return;
    }

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }
      await updateProgressEntry(payload);
      setEditMessage("Progress updated successfully.");
      await loadDashboard();
      setTimeout(closeEditModal, 500);
    } catch (error) {
      setEditMessage(error.message || "Failed to update progress.", true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
      }
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
  setLoggedInUserEmail(user);
  setupForm();
  setupHistoryActions();
  setupEditModal();
  setupLogout();

  try {
    setDashboardLoading(true, "Loading dashboard progress...");
    await loadDashboard();
  } catch (error) {
    setFormMessage(error.message || "Failed to load dashboard.", true);
    setDashboardLoading(false);
  }
}

init();
