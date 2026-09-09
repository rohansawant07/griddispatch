"use client";
import { useEffect, useRef } from "react";
import type { Result } from "./types";

type ToolRegistry = {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute(input: unknown): unknown;
  }, options: { signal: AbortSignal }): void | Promise<void>;
};

/** Optional page-scoped evidence access; never executes an asset action. */
export function useDispatchTool(result: Result | null) {
  const latest = useRef(result);
  latest.current = result;
  useEffect(() => {
    const registry = (document as Document & { modelContext?: ToolRegistry }).modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(registry.registerTool({
        name: "inspect_dispatch_interval",
        description: "Read one interval and its deterministic evidence from the last completed dispatch run. Does not run optimization or control a battery.",
        inputSchema: { type: "object", properties: { interval_index: { type: "integer", minimum: 0, maximum: 95 } }, required: ["interval_index"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input: unknown) {
          if (!input || typeof input !== "object" || Object.keys(input).length !== 1 || !("interval_index" in input)) throw new Error("Provide only interval_index");
          const index = input.interval_index;
          if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || !latest.current || index >= latest.current.schedule.length) throw new Error("Interval unavailable or outside the completed horizon");
          return { interval: latest.current.schedule[index], explanation: latest.current.explanations[index], audit: latest.current.audit };
        }
      }, { signal: lifecycle.signal })).catch(() => { /* Optional browser capability. UI remains available. */ });
    } catch { /* Unsupported registries do not block the dashboard. */ }
    return () => lifecycle.abort();
  }, []);
}
