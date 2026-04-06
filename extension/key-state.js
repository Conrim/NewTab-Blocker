// see issue #6

const BYPASS_WINDOW_MS = 1000;

function armBypassFromGesture(e) {
  // Only real user gestures
  if (!e.isTrusted) return;

  // Windows/Linux: Ctrl+Click
  // macOS: Cmd+Click
  const letPass = e.ctrlKey || e.metaKey || e.shiftKey || (e.button === 1);
  if (!letPass) return;

  console.log("New-Tab-Blocker: Ctrl-Click detected");
  
  chrome.runtime.sendMessage({
    name: "ctrlClick",
    until: Date.now() + BYPASS_WINDOW_MS
  }).catch(() => {
    // ignore if worker is temporarily unavailable
  });
}

// Capture phase helps because some pages stop propagation later.
window.addEventListener("pointerdown", armBypassFromGesture, true);
window.addEventListener("click", armBypassFromGesture, true);
window.addEventListener("auxclick", armBypassFromGesture, true);