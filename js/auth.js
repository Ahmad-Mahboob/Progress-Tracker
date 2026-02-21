import { supabase } from "./supabaseClient.js";

function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.className = isError ? "text-sm text-red-600" : "text-sm text-emerald-600";
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector("#email")?.value?.trim();
  const password = form.querySelector("#password")?.value;
  const messageEl = document.getElementById("authMessage");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(messageEl, error.message, true);
    return;
  }

  setMessage(messageEl, "Login successful. Redirecting...");
  window.location.href = "./index.html";
}

async function handleSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector("#email")?.value?.trim();
  const password = form.querySelector("#password")?.value;
  const messageEl = document.getElementById("authMessage");

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    setMessage(messageEl, error.message, true);
    return;
  }

  setMessage(messageEl, "Signup successful. Check your email for confirmation, then login.");
}

export async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "./login.html";
    return null;
  }

  return data.session.user;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "./login.html";
}

function initAuthPage() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (signupForm) signupForm.addEventListener("submit", handleSignup);
}

initAuthPage();
