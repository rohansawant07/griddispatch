"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { Battery, Interval } from "@/lib/types";
import { time } from "@/lib/api";
export default function SocChart({
  battery,
  schedule,
  baseline,
}: {
  battery: Battery;
  schedule: Interval[];
  baseline?: Interval[];
}) {
  const data = [
    {
      time: time(schedule[0].timestamp),
      soc: battery.initial_soc * 100,
      baseline: baseline ? battery.initial_soc * 100 : undefined,
    },
    ...schedule.map((s, i) => ({
      time: time(
        new Date(new Date(s.timestamp).getTime() + 900000).toISOString(),
      ),
      soc: s.soc_after * 100,
      baseline:
        baseline?.[i].soc_after !== undefined
          ? baseline[i].soc_after * 100
          : undefined,
    })),
  ];
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Stored energy</h2>
        <div className="legend">
          <span>
            <i style={{ background: "#62c8bd" }} />
            Recommended SOC
          </span>
          {baseline && (
            <span>
              <i style={{ background: "#b2bac2" }} />
              Baseline
            </span>
          )}
        </div>
      </div>
      <div
        className="soc-chart"
        role="img"
        aria-label="State of charge with configured minimum and maximum boundaries"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, left: 0, right: 20, bottom: 0 }}
          >
            <CartesianGrid stroke="#29323b" vertical={false} />
            <XAxis
              dataKey="time"
              interval={15}
              tick={{ fill: "#a7b2bc", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={48}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#a7b2bc", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#17212b",
                border: "1px solid #45505a",
              }}
            />
            <ReferenceLine
              y={battery.min_soc * 100}
              stroke="#d2a779"
              strokeDasharray="4 4"
              label={{
                value: "MIN",
                fill: "#d2a779",
                fontSize: 12,
                position: "insideBottomRight",
              }}
            />
            <ReferenceLine
              y={battery.max_soc * 100}
              stroke="#d2a779"
              strokeDasharray="4 4"
              label={{
                value: "MAX",
                fill: "#d2a779",
                fontSize: 12,
                position: "insideBottomRight",
              }}
            />
            <Line
              dataKey="soc"
              name="Recommended SOC %"
              stroke="#62c8bd"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {baseline && (
              <Line
                dataKey="baseline"
                name="Baseline SOC %"
                stroke="#b2bac2"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
