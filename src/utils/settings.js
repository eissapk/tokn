/**
 * Opening and closing the SettingsDialog. (olum-ui's Dialog opens when its hidden checkbox is checked.)
 * The dialog never reads the store (it lives in <body>, so a re-render would be lost);
 * the field is filled from `chat` here, each time it opens.
 */
import { chat } from "./store.js";

const toggle = () => document.querySelector('[data-slot="dialog"] > input');

const setOpen = (open) => {
  const input = toggle();
  if (!input) return;
  input.checked = open;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

/** Show `message` under the endpoint field, or clear it with "". */
export const showSettingsError = (message) => {
  const field = document.getElementById("settings-endpoint");
  const error = document.getElementById("settings-error");
  if (field) field.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) {
    error.textContent = message;
    error.classList.toggle("hidden", !message);
  }
};

export const openSettings = () => {
  const field = document.getElementById("settings-endpoint");
  if (field) field.value = chat.endpoint;
  showSettingsError("");
  setOpen(true);
  // rAF: the dialog is display:none until the checkbox's change handler shows it.
  requestAnimationFrame(() => field?.select());
};

export const closeSettings = () => setOpen(false);
