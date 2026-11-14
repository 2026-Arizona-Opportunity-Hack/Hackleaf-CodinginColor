import "server-only";

export function isDemoWorkspace() {
  return (process.env.APP_DATA_MODE ?? "demo") === "demo";
}
