import { supabase } from "./supabaseClient.js";

export async function saveProgress(payload) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("You are not logged in.");
  }

  const { error } = await supabase.from("daily_progress").insert([
    {
      user_id: userId,
      date: payload.date,
      english_chapters_completed: payload.english,
      urdu_items_completed: payload.urdu,
      pakstudies_pages_completed: payload.pakStudies,
      quran_surahs_completed: payload.quran,
      essay_completed: payload.essay,
      notes: payload.notes,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }
}

export function getFormPayload() {
  return {
    date: document.getElementById("date")?.value,
    english: Number(document.getElementById("english")?.value || 0),
    urdu: Number(document.getElementById("urdu")?.value || 0),
    pakStudies: Number(document.getElementById("pakStudies")?.value || 0),
    quran: Number(document.getElementById("quran")?.value || 0),
    essay: Boolean(document.getElementById("essay")?.checked),
    notes: document.getElementById("notes")?.value?.trim() || null,
  };
}
