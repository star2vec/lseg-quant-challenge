"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import type { LogEntry } from "@/app/page";

interface InputCard {
  id: number;
  query: string;
}

interface Props {
  onSubmit: (query: string) => Promise<void>;
  onDeepDive: (query: string) => Promise<void>;
  onClear: () => void;
  isLoading: boolean;
  logs: LogEntry[];
}

const COLOR_MAP: Record<string, string> = {
  teal:   "#14b8a6",
  blue:   "#60a5fa",
  yellow: "#fbbf24",
  green:  "#34d399",
  red:    "#f87171",
  slate:  "#64748b",
};

export default function InputPanel({ onSubmit, onDeepDive, onClear, isLoading, logs }: Props) {
  const [cards, setCards] = useState<InputCard[]>([{ id: 0, query: "" }]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const updateCard = (id: number, query: string) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, query } : c)));

  const addCard = () =>
    setCards((prev) => [...prev, { id: Date.now(), query: "" }]);

  const removeCard = (id: number) =>
    setCards((prev) => prev.filter((c) => c.id !== id));

  const handleClear = () => {
    setCards([{ id: 0, query: "" }]);
    onClear();
  };

  return (
    <aside className="w-96 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-700 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h1 className="text-sm font-semibold text-teal-400 tracking-wide uppercase">
            Workflow Diagram
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">AI Architecture Builder</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-rose-400 border border-rose-800 rounded-md hover:bg-rose-950 transition-colors"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* Loading bar */}
      <div className="h-0.5 w-full bg-slate-800 flex-shrink-0 overflow-hidden">
        {isLoading && (
          <div
            className="h-full bg-teal-400"
            style={{
              animation: "indeterminate 1.4s ease-in-out infinite",
              boxShadow: "0 0 8px #14b8a6, 0 0 16px #14b8a644",
            }}
          />
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {cards.map((card, idx) => (
          <div
            key={card.id}
            className="bg-slate-800 rounded-xl border border-slate-600 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">
                {idx === 0 ? "Initial Query" : `Update #${idx}`}
              </span>
              {idx > 0 && (
                <button
                  onClick={() => removeCard(card.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <textarea
              value={card.query}
              onChange={(e) => updateCard(card.id, e.target.value)}
              placeholder={
                idx === 0
                  ? "Describe your system architecture…\ne.g. 'An orchestrator receives queries, applies guardrails, routes to sentiment or summarization tools'"
                  : "Add more detail or modify the graph…\ne.g. 'Make the classifier node blue'"
              }
              className="w-full bg-slate-900 text-slate-100 text-sm rounded-lg p-3 border border-slate-600 focus:border-teal-500 focus:outline-none resize-none placeholder-slate-500 min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  onSubmit(card.query);
                }
              }}
            />
            <button
              onClick={() => onSubmit(card.query)}
              disabled={isLoading || !card.query.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Zap size={14} />
              {isLoading ? "Generating…" : idx === 0 ? "Generate Graph" : "Update Graph"}
            </button>
            <button
              onClick={() => onDeepDive(card.query)}
              disabled={isLoading || !card.query.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-purple-950/50 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 text-purple-300 text-sm font-medium rounded-lg transition-all border border-purple-700 hover:border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.25)] hover:shadow-[0_0_18px_rgba(168,85,247,0.5)]"
            >
              Deep Dive
            </button>
          </div>
        ))}

        {/* Add card button */}
        <button
          onClick={addCard}
          className="flex items-center justify-center gap-2 py-2 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-teal-500 hover:text-teal-400 transition-colors text-sm"
        >
          <Plus size={16} />
          Add Update
        </button>
      </div>

      {/* Live Log Panel */}
      {logs.length > 0 && (
        <div className="mx-4 mb-4 bg-black/80 border-2 border-teal-500 rounded-xl p-3 font-mono text-xs max-h-72 overflow-y-auto flex-shrink-0 shadow-[0_0_18px_rgba(20,184,166,0.45),inset_0_0_12px_rgba(20,184,166,0.06)]">
          <p className="text-teal-400 uppercase tracking-widest text-[10px] mb-2 select-none">
            ◈ Live Log
          </p>
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2 leading-5">
              <span className="text-slate-600 flex-shrink-0">{l.ts}</span>
              <span style={{ color: COLOR_MAP[l.color] ?? "#94a3b8" }}>{l.msg}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </aside>
  );
}
