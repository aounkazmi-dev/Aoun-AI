// Only a public API origin belongs here. Provider credentials stay on Render.
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
export const apiUrl = (path: string) => `${base}${path}`;
