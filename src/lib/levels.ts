// Traffic light levels shared by CLTL and Manual Level: "ORANGE_1" reads as "Orange 1" and gets the orange tone.
export const levelTone = (l?: string | null) =>
  (!l || /^(NONE|BASIC)$/i.test(l) ? "green" : /^(YELLOW|ORANGE)/i.test(l) ? "orange" : "red") as "green" | "orange" | "red";
export const levelLabel = (l?: string | null) =>
  l ? l.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Normal";
