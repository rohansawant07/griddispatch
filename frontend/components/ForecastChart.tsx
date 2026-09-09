"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { Forecast, Result } from "@/lib/types";
import { time } from "@/lib/api";
export default function ForecastChart({
  forecast,
  result,
}: {
  forecast: Forecast[];
  result: Result;
}) {
  const data = forecast.map((p, i) => ({
    ...p,
    time: time(p.timestamp),
    band: [p.p10, p.p90],
    charge: -result.schedule[i].charge_mw,
    discharge: result.schedule[i].discharge_mw,
  }));
  return (
    <section className="panel forecast-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FORECAST → ACTION</span>
          <h2>Price distribution & dispatch</h2>
        </div>
        <span className="muted">15-minute intervals · UTC</span>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: "#d9ef82" }} />
          p50 forecast
        </span>
        <span>
          <i style={{ background: "#778661" }} />
          p10–p90 band
        </span>
        <span>
          <i style={{ background: "#e6a870" }} />
          Charge −MW
        </span>
        <span>
          <i style={{ background: "#62c8bd" }} />
          Discharge +MW
        </span>
      </div>
      <div
        className="chart"
        role="img"
        aria-label="Probabilistic price forecast and optimized grid-side battery power"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
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
              yAxisId="price"
              tick={{ fill: "#a7b2bc", fontSize: 12 }}
              width={48}
              axisLine={false}
              tickLine={false}
              label={{
                value: "$/MWh",
                position: "insideTopLeft",
                fill: "#a7b2bc",
                fontSize: 12,
                dy: 0,
              }}
            />
            <YAxis
              yAxisId="power"
              orientation="right"
              tick={{ fill: "#a7b2bc", fontSize: 12 }}
              width={45}
              axisLine={false}
              tickLine={false}
              label={{
                value: "MW",
                position: "insideTopRight",
                fill: "#a7b2bc",
                fontSize: 12,
                dy: 0,
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#17212b",
                border: "1px solid #45505a",
                borderRadius: 6,
              }}
              labelStyle={{ color: "#fff" }}
            />
            <ReferenceLine yAxisId="power" y={0} stroke="#46515b" />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="band"
              name="p10–p90"
              stroke="none"
              fill="#b2c981"
              fillOpacity={0.14}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="p10"
              stroke="#76875f"
              strokeDasharray="3 4"
              dot={false}
              strokeWidth={1}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="p90"
              stroke="#76875f"
              strokeDasharray="3 4"
              dot={false}
              strokeWidth={1}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="power"
              dataKey="charge"
              name="Charge MW"
              fill="#e6a870"
              opacity={0.8}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="power"
              dataKey="discharge"
              name="Discharge MW"
              fill="#62c8bd"
              opacity={0.85}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="p50"
              stroke="#d9ef82"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
