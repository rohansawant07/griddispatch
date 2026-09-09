import type { Baseline } from "./types";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail),
    );
  return data as T;
}
export async function uploadForecast(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/backend/forecast/import", {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail),
    );
  return data;
}
export async function readBaseline(file: File): Promise<Baseline[]> {
  if (file.size > 1000000) throw new Error("Baseline upload exceeds 1 MB");
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json")) {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Baseline JSON must be an array");
    return data as Baseline[];
  }
  // Baseline fields cannot contain commas. Forecast CSV parsing is handled by pandas.
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((value) => value.trim()));
  if (lines[0].join(",") !== "timestamp,action,power_mw")
    throw new Error(
      "Baseline CSV requires timestamp,action,power_mw in that order",
    );
  return lines.slice(1).map((row) => {
    if (row.length !== 3 || !row[2] || !Number.isFinite(Number(row[2])))
      throw new Error("Invalid baseline CSV row");
    return {
      timestamp: row[0],
      action: row[1] as Baseline["action"],
      power_mw: Number(row[2]),
    };
  });
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export const num = (value: number, digits = 1) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });
export const time = (stamp: string) =>
  new Date(stamp).toISOString().slice(11, 16);
