import { useState } from "react";
import type { Interval, Action } from "@/lib/types";
import { time, num } from "@/lib/api";
export default function DecisionTimeline({
  schedule,
  selected,
  onSelect,
}: {
  schedule: Interval[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const [filter, setFilter] = useState<Action | "ALL">("ALL");
  return (
    <section className="panel timeline">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">INTERVAL AUDIT</span>
          <h2>Decision timeline</h2>
        </div>
        <label className="filter">
          <span className="sr-only">Filter actions</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Action | "ALL")}
          >
            <option value="ALL">All actions</option>
            <option>CHARGE</option>
            <option>HOLD</option>
            <option>DISCHARGE</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>UTC</th>
              <th>Action</th>
              <th>MW</th>
              <th>p50 $/MWh</th>
              <th>SOC after</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map(
              (s, i) =>
                (filter === "ALL" || s.action === filter) && (
                  <tr
                    key={s.timestamp}
                    className={i === selected ? "selected" : ""}
                  >
                    <td>
                      <button
                        className="row-button"
                        aria-label={`Explain ${time(s.timestamp)} ${s.action}`}
                        aria-pressed={selected === i}
                        onClick={() => onSelect(i)}
                      >
                        {time(s.timestamp)} <span aria-hidden>↗</span>
                      </button>
                    </td>
                    <td>
                      <span className={`action ${s.action.toLowerCase()}`}>
                        {s.action}
                      </span>
                    </td>
                    <td>{num(s.power_mw)}</td>
                    <td>{num(s.expected_price)}</td>
                    <td>{num(s.soc_after * 100)}%</td>
                  </tr>
                ),
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        {schedule.length} intervals · select a time to inspect its decision
      </div>
    </section>
  );
}
