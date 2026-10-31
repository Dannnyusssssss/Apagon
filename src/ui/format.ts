/** Formats seconds as m:ss.d (for example 83.46 -> "1:23.4"). */
export function formatTime(seconds: number): string {
  const tenths = Math.max(0, Math.floor(seconds * 10));
  const minutes = Math.floor(tenths / 600);
  const rest = tenths - minutes * 600;
  const secs = Math.floor(rest / 10);
  const tenth = rest % 10;
  return `${String(minutes)}:${String(secs).padStart(2, '0')}.${String(tenth)}`;
}
