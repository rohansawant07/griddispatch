import type { Summary } from "@/lib/types";
import { money, num } from "@/lib/api";
export default function SummaryCards({ summary: s }: { summary: Summary }) {
  const cards = [
    [
      "Estimated gross value",
      money(s.estimated_gross_value),
      "All schedules valued at p50",
    ],
    ["Ending SOC", `${num(s.ending_soc * 100)}%`, "Restored to starting SOC"],
    [
      "Equivalent cycles",
      num(s.equivalent_cycles, 2),
      `${num(s.cycle_budget, 2)} horizon allowance`,
    ],
    [
      "Dispatched energy",
      `${num(s.energy_discharged_mwh)} MWh`,
      `${num(s.energy_charged_mwh)} MWh charged · grid side`,
    ],
  ];
  return (
    <div className="summary-grid">
      {cards.map(([label, value, note], i) => (
        <section className={`metric ${i === 0 ? "highlight" : ""}`} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </section>
      ))}
    </div>
  );
}
