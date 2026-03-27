"use client";

import { useState, useCallback } from "react";
import InputPanel from "@/components/InputPanel";
import GraphCanvas from "@/components/GraphCanvas";
import { Node, Edge } from "@xyflow/react";
import dagre from "dagre";

const NODE_W = 160;
const NODE_H = 60;
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type LogEntry = { msg: string; color: string; ts: string };

function getLayoutedElements(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 80 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}

function makeNode(n: any): Node {
  return {
    id: n.id,
    type: n.shape === "cylinder" ? "cylinder" : "default",
    position: { x: 0, y: 0 },
    data: { label: n.label, _type: n.type, color: n.color },
    style: {
      background: n.color,
      color: "#fff",
      border: `2px solid ${n.color}cc`,
      borderRadius: n.shape === "ellipse" ? "50%" : "8px",
      width: n.shape === "ellipse" ? 120 : 160,
      height: n.shape === "ellipse" ? 60 : NODE_H,
      fontSize: "12px",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 14px ${n.color}99, 0 0 5px ${n.color}66, inset 0 0 10px rgba(0,0,0,0.28)`,
      textShadow: "0 0 6px rgba(255,255,255,0.35)",
    },
  };
}

function makeEdge(e: any, i: number): Edge {
  return {
    id: `e-${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.style === "dashed",
    style: {
      stroke: e.color ?? "#14b8a6",
      strokeWidth: 3.5,
      filter: `drop-shadow(0 0 10px ${e.color ?? "rgba(20,184,166,0.9)"}) drop-shadow(0 0 4px ${e.color ?? "rgba(20,184,166,0.6)"})`,
    },
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: "#111", fillOpacity: 0.92 },
    type: "smoothstep",
    markerEnd: { type: "arrowclosed" as any, color: e.color ?? "#94a3b8" },
  };
}

export default function Home() {
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((msg: string, color: string) => {
    const ts = new Date().toLocaleTimeString("en", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev, { msg, color, ts }]);
  }, []);

  const handleUpdateGraph = useCallback(
    async (query: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BASE}/api/extract/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(await res.text());

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const evt = JSON.parse(part.slice(6));
            if (evt.msg) addLog(evt.msg, evt.color ?? "slate");
            if (evt.type === "done" && evt.graph) {
              const rawNodes: Node[] = evt.graph.nodes.map(makeNode);
              const newEdges: Edge[] = evt.graph.edges.map(makeEdge);
              setRfNodes(getLayoutedElements(rawNodes, newEdges));
              setRfEdges(newEdges);
            }
          }
        }
      } catch (err) {
        addLog(`✗ ${String(err)}`, "red");
        console.error("Graph extraction failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [addLog]
  );

  const handleDeepDive = useCallback(
    async (query: string) => {
      const expanded =
        query +
        " Expand this system into a highly detailed, production-ready architecture. Add necessary sub-components like load balancers, caching layers (Redis), monitoring tools, or security gateways. Connect them logically to the original components.";
      await handleUpdateGraph(expanded);
    },
    [handleUpdateGraph]
  );

  const handleClearWorkspace = useCallback(() => {
    setRfNodes([]);
    setRfEdges([]);
    setLogs([]);
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <InputPanel
        onSubmit={handleUpdateGraph}
        onDeepDive={handleDeepDive}
        onClear={handleClearWorkspace}
        isLoading={isLoading}
        logs={logs}
      />
      <GraphCanvas nodes={rfNodes} edges={rfEdges} />
    </div>
  );
}
