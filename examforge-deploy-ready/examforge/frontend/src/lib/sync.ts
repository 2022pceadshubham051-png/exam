import { api } from "./api"; import { exportNotebook, mergeNotebook } from "./notebook"; import { exportPrefs, importPrefs } from "./prefs";
// Keeps the notebook and a few preferences identical across a student's devices. Failures are silent: local data always works.
let started = false, pulling = false, timer: number | undefined;
const push = () => { if (pulling) return; clearTimeout(timer); timer = window.setTimeout(() => { api("/sync", "PUT", { data: { v: 1, notebook: exportNotebook(), prefs: exportPrefs() } }).catch(() => {}); }, 2000); };
export async function startSync() {
  if (started) return; started = true;
  try { pulling = true; const r = await api("/sync"); if (r?.data) { mergeNotebook(r.data.notebook); importPrefs(r.data.prefs); } } catch { /* offline */ } finally { pulling = false; }
  push(); // upload whatever this device has that the server did not
  window.addEventListener("ef-notebook", push); window.addEventListener("ef-prefs", push);
}
