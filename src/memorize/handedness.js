const KEY = "gcq-handedness";

/** @returns {"right" | "left"} */
export function getHandedness() {
  const v = localStorage.getItem(KEY);
  return v === "left" ? "left" : "right";
}

/** @param {"right" | "left"} value */
export function setHandedness(value) {
  localStorage.setItem(KEY, value === "left" ? "left" : "right");
}
