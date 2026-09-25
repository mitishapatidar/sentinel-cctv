// Lightweight app-wide toast: call toast("Saved", "success") from anywhere; <ToastHost /> renders it.
export function toast(message, type = "info") {
  window.dispatchEvent(new CustomEvent("sentinel-toast", { detail: { message, type } }));
}
