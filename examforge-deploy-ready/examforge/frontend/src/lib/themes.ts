/** Look of a subject's railway map. A teacher can pick one per subject; otherwise it is chosen from the subject name (and, failing that, from its id) so a course is not all green. */
export type ThemeId = "farm" | "desert" | "mountain" | "snow";
export type Plant = "round" | "cactus" | "pine" | "snowpine";
export type Theme = {
  id: ThemeId; label: string; emoji: string;
  base: string; stripe: number; patch: [string, string]; furrow: string;
  water: { fill: string; rim: string; shine: number }; frozen?: boolean;
  dots: string[]; plants: Plant[]; leaf: [string, string][]; boulders?: boolean; cloud: string; cloudOpacity: number;
};

export const THEMES: Record<ThemeId, Theme> = {
  farm: { id: "farm", label: "Farm", emoji: "🌾", base: "#7fc962", stripe: 0.07, patch: ["#a8d97a", "#c4e08a"], furrow: "#8cc05f", water: { fill: "#58b6e6", rim: "#d8c79a", shine: 0.45 },
    dots: ["#fff", "#ffd166", "#ff9ec4"], plants: ["round"], leaf: [["#2e8b4f", "#45ad69"], ["#277a46", "#3c9a5c"], ["#3a9a55", "#58bd78"]], cloud: "#fff", cloudOpacity: 1 },
  desert: { id: "desert", label: "Desert", emoji: "🏜️", base: "#ecd08f", stripe: 0.16, patch: ["#f3dca3", "#e2bf74"], furrow: "#d3ad63", water: { fill: "#4fb8c9", rim: "#7fb35a", shine: 0.4 },
    dots: ["#c9a057", "#fff3cf", "#b98b44"], plants: ["cactus", "round"], leaf: [["#4f9a5b", "#6cb775"], ["#3f8650", "#5aa468"], ["#8a9a4a", "#a9b963"]], cloud: "#fff6e0", cloudOpacity: 0.85 },
  mountain: { id: "mountain", label: "Mountain", emoji: "⛰️", base: "#98b58e", stripe: 0.09, patch: ["#b4c2a8", "#a3b39a"], furrow: "#8a9c82", water: { fill: "#6fb3da", rim: "#bdb8aa", shine: 0.45 },
    dots: ["#fff", "#ffd166", "#c7a6ff"], plants: ["pine", "pine", "round"], leaf: [["#2f6b4a", "#44895f"], ["#27594a", "#3b7a64"], ["#3d7a52", "#58a073"]], boulders: true, cloud: "#fff", cloudOpacity: 1 },
  snow: { id: "snow", label: "Snow", emoji: "❄️", base: "#e7f1f8", stripe: 0.5, patch: ["#d4e6f2", "#c3dbec"], furrow: "#b2cde1", water: { fill: "#b9e1f4", rim: "#ffffff", shine: 0.7 }, frozen: true,
    dots: ["#ffffff", "#bcd7ea", "#d9ecf8"], plants: ["snowpine"], leaf: [["#2d6a63", "#3f8a80"], ["#285c66", "#397b86"], ["#34746a", "#4b968b"]], cloud: "#f4f9fc", cloudOpacity: 0.9 },
};
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const isTheme = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;

const RULES: [ThemeId, RegExp][] = [
  ["desert", /math|quant|aptitude|arithmetic|algebra|geometr|number|calculat|गणित|अंक|बीज|ज्यामिति/i],
  ["snow", /scien|physic|chem|bio|environment|विज्ञान|भौतिक|रसायन|जीव/i],
  ["mountain", /reason|logic|mental|puzzle|intelligence|computer|तर्क|बुद्धि|कंप्यूटर/i],
  ["farm", /english|hindi|gk\b|general|gs\b|history|polity|geograph|econom|current|grammar|vocab|अंग्रेज|हिंदी|हिन्दी|इतिहास|भूगोल|राजनीति|अर्थ|सामान्य/i],
];
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/** The theme of a subject: the teacher's pick, else a match on its name, else a steady choice from its id (never changes between visits). */
export function themeFor(s: { id: string; name?: string | null; theme?: string | null }): Theme {
  if (isTheme(s.theme)) return THEMES[s.theme];
  const name = s.name ?? ""; for (const [id, re] of RULES) if (re.test(name)) return THEMES[id];
  return THEMES[THEME_IDS[hash(s.id) % THEME_IDS.length]];
}
