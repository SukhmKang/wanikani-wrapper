// Module-level toast system — call showToast() from anywhere, no context needed

export function showToast(message, type = 'error') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }))
}
