import { supabase } from "./supabaseClient.js";
import { requireAuth, logout } from "./auth.js";
import { getWeekRange, toISODate } from "./report.js";

let revisionEntries = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setMessage(id, message, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "text-sm text-red-600" : "text-sm text-emerald-600";
}

function setPageLoading(isLoading, message = "Loading revision progress...") {
  const loader = document.getElementById("revisionPageLoader");
  const loaderText = document.getElementById("revisionPageLoaderText");
  if (!loader) return;

  if (loaderText) loaderText.textContent = message;

  if (isLoading) {
    loader.classList.remove("hidden");
    loader.classList.add("flex");
  } else {
    loader.classList.remove("flex");
    loader.classList.add("hidden");
  }
}

function getRevisionInsight(weeklyCount, lastDate) {
  if (weeklyCount >= 4) {
    return "Great revision consistency.";
  }

  if (!lastDate) {
    return "You should revise today.";
  }

  const today = new Date();
  const last = new Date(`${lastDate}T00:00:00`);
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (diffDays >= 3) {
    return "You should revise today.";
  }

  return "Revision momentum is building well.";
}

function renderRevisionTable(rows) {
  const body = document.getElementById("revisionHistoryBody");
  body.innerHTML = "";

  if (!rows.length) {
    body.innerHTML = "<tr><td colspan='6' class='py-4 text-slate-500'>No revision entries yet.</td></tr>";
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-2 pr-4">${escapeHtml(row.date)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.parah_number)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.rukooh_number)}</td>
      <td class="py-2 pr-4">${escapeHtml(row.notes || "-")}</td>
      <td class="py-2 pr-4">
        <button data-edit-id="${escapeHtml(row.id)}" class="px-2 py-1 text-xs rounded-md border border-slate-300 hover:bg-slate-100">Edit</button>
      </td>
      <td class="py-2 pr-4">
        <button data-delete-id="${escapeHtml(row.id)}" class="px-2 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50">Delete</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

function renderRevisionStats(allRows, weeklyRows) {
  const weeklyCount = weeklyRows.length;
  const latest = allRows[0];

  document.getElementById("revisionWeekTotal").textContent = weeklyCount;
  document.getElementById("lastRevised").textContent = latest
    ? `Parah ${latest.parah_number}, Rukooh ${latest.rukooh_number}`
    : "-";
  document.getElementById("revisionSummary").textContent = latest
    ? `Latest on ${latest.date}`
    : "No revision yet";
  document.getElementById("revisionInsight").textContent = getRevisionInsight(weeklyCount, latest?.date || null);
}

async function getCurrentUserId() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("You are not logged in.");
  return userId;
}

async function fetchRevisionRows() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("quran_revision")
    .select("id, date, parah_number, rukooh_number, notes")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchWeeklyRevisionRows() {
  const userId = await getCurrentUserId();
  const { start, end } = getWeekRange(new Date());
  const from = toISODate(start);
  const to = toISODate(end);

  const { data, error } = await supabase
    .from("quran_revision")
    .select("id, date, parah_number, rukooh_number, notes")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (error) throw new Error(error.message);
  return data || [];
}

function validateRevisionPayload(payload) {
  if (!payload.date) return "Please select a date.";
  if (Number.isNaN(payload.parah) || payload.parah < 1 || payload.parah > 30) return "Parah number must be between 1 and 30.";
  if (Number.isNaN(payload.rukooh) || payload.rukooh < 1) return "Rukooh number must be 1 or greater.";
  return null;
}

async function createRevisionEntry(payload) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("quran_revision").insert([
    {
      user_id: userId,
      date: payload.date,
      parah_number: payload.parah,
      rukooh_number: payload.rukooh,
      notes: payload.notes,
    },
  ]);

  if (error) throw new Error(error.message);
}

async function updateRevisionEntry(payload) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("quran_revision")
    .update({
      date: payload.date,
      parah_number: payload.parah,
      rukooh_number: payload.rukooh,
      notes: payload.notes,
    })
    .eq("id", payload.id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

async function deleteRevisionEntry(id) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("quran_revision").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function loadRevisionPage() {
  setPageLoading(true, "Loading revision progress...");
  try {
    const [allRows, weeklyRows] = await Promise.all([fetchRevisionRows(), fetchWeeklyRevisionRows()]);
    revisionEntries = allRows;
    renderRevisionTable(allRows);
    renderRevisionStats(allRows, weeklyRows);
  } finally {
    setPageLoading(false);
  }
}

function openEditModal(entry) {
  document.getElementById("editRevisionId").value = entry.id;
  document.getElementById("editRevisionDate").value = entry.date;
  document.getElementById("editParahNumber").value = entry.parah_number;
  document.getElementById("editRukoohNumber").value = entry.rukooh_number;
  document.getElementById("editRevisionNotes").value = entry.notes || "";
  document.getElementById("revisionEditMessage").textContent = "";
  const modal = document.getElementById("revisionEditModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEditModal() {
  const modal = document.getElementById("revisionEditModal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

function setupCreateForm() {
  const dateInput = document.getElementById("revisionDate");
  dateInput.value = toISODate(new Date());

  const form = document.getElementById("revisionForm");
  const submitBtn = document.getElementById("saveRevisionBtn");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      date: document.getElementById("revisionDate").value,
      parah: Number(document.getElementById("parahNumber").value),
      rukooh: Number(document.getElementById("rukoohNumber").value),
      notes: document.getElementById("revisionNotes").value.trim() || null,
    };

    const validationError = validateRevisionPayload(payload);
    if (validationError) {
      setMessage("revisionFormMessage", validationError, true);
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
      setPageLoading(true, "Saving revision entry...");
      await createRevisionEntry(payload);
      setMessage("revisionFormMessage", "Revision entry saved successfully.");
      form.reset();
      dateInput.value = toISODate(new Date());
      await loadRevisionPage();
    } catch (error) {
      setMessage("revisionFormMessage", error.message || "Failed to save revision entry.", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save Revision";
      setPageLoading(false);
    }
  });
}

function setupHistoryActions() {
  const body = document.getElementById("revisionHistoryBody");
  body?.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("button[data-edit-id]");
    if (editBtn) {
      const entry = revisionEntries.find((item) => item.id === editBtn.dataset.editId);
      if (entry) openEditModal(entry);
      return;
    }

    const deleteBtn = event.target.closest("button[data-delete-id]");
    if (!deleteBtn) return;

    const id = deleteBtn.dataset.deleteId;
    const confirmed = window.confirm("Delete this revision entry?");
    if (!confirmed) return;

    try {
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting...";
      setPageLoading(true, "Deleting revision entry...");
      await deleteRevisionEntry(id);
      await loadRevisionPage();
      setMessage("revisionFormMessage", "Revision entry deleted.");
    } catch (error) {
      setMessage("revisionFormMessage", error.message || "Failed to delete entry.", true);
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = "Delete";
      setPageLoading(false);
    }
  });
}

function setupEditForm() {
  const closeBtn = document.getElementById("closeRevisionModalBtn");
  closeBtn?.addEventListener("click", closeEditModal);

  const modal = document.getElementById("revisionEditModal");
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeEditModal();
  });

  const form = document.getElementById("editRevisionForm");
  const saveBtn = document.getElementById("saveRevisionEditBtn");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      id: document.getElementById("editRevisionId").value,
      date: document.getElementById("editRevisionDate").value,
      parah: Number(document.getElementById("editParahNumber").value),
      rukooh: Number(document.getElementById("editRukoohNumber").value),
      notes: document.getElementById("editRevisionNotes").value.trim() || null,
    };

    if (!payload.id) {
      setMessage("revisionEditMessage", "Missing entry ID. Reopen edit form.", true);
      return;
    }

    const validationError = validateRevisionPayload(payload);
    if (validationError) {
      setMessage("revisionEditMessage", validationError, true);
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      setPageLoading(true, "Updating revision entry...");
      await updateRevisionEntry(payload);
      setMessage("revisionEditMessage", "Revision entry updated.");
      await loadRevisionPage();
      setTimeout(closeEditModal, 500);
    } catch (error) {
      setMessage("revisionEditMessage", error.message || "Failed to update entry.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
      setPageLoading(false);
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

  setupCreateForm();
  setupHistoryActions();
  setupEditForm();
  setupLogout();

  try {
    await loadRevisionPage();
  } catch (error) {
    setMessage("revisionFormMessage", error.message || "Failed to load revision data.", true);
  }
}

init();
