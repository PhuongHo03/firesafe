const ALERT_COUNT_CHANGED_EVENT = "firesafe:alerts:new-count-changed";

export function notifyAlertCountChanged() {
  window.dispatchEvent(new Event(ALERT_COUNT_CHANGED_EVENT));
}

export function subscribeAlertCountChanged(listener: () => void) {
  window.addEventListener(ALERT_COUNT_CHANGED_EVENT, listener);
  return () => window.removeEventListener(ALERT_COUNT_CHANGED_EVENT, listener);
}
