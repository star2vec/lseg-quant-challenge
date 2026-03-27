"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";

function CylinderNode({ data }: NodeProps) {
  const color = (data.color as string) ?? "#2980B9";
  return (
    <div style={{ position: "relative", width: 140 }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      {/* Top ellipse cap */}
      <div style={{
        height: 14, background: `${color}ee`, borderRadius: "50%",
        border: `2px solid ${color}cc`, marginBottom: -7,
        position: "relative", zIndex: 1,
        boxShadow: `0 0 8px ${color}88`,
      }} />
      {/* Body */}
      <div style={{
        background: color, border: `2px solid ${color}cc`,
        borderTop: "none", borderBottom: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "10px 8px",
        boxShadow: `0 0 14px ${color}99, inset 0 0 10px rgba(0,0,0,0.28)`,
      }}>
        <span style={{
          color: "#fff", fontSize: 12, fontWeight: 700,
          textShadow: "0 0 6px rgba(255,255,255,0.35)", textAlign: "center",
        }}>
          {data.label as string}
        </span>
      </div>
      {/* Bottom ellipse cap */}
      <div style={{
        height: 14, background: `${color}bb`, borderRadius: "50%",
        border: `2px solid ${color}cc`, marginTop: -7,
        boxShadow: `0 0 8px ${color}88`,
      }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { cylinder: CylinderNode };

interface Props {
  nodes: Node[];
  edges: Edge[];
}

const NODE_TYPE_COLORS: Record<string, string> = {
  tool: "#C0392B",
  classifier: "#27AE60",
  database: "#2980B9",
  user: "#8E44AD",
  component: "#34495E",
  queue: "#E67E22",
  service: "#16A085",
};

export default function GraphCanvas({ nodes, edges }: Props) {
  const [rfNodes, setRfNodes, handleNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, handleEdgesChange] = useEdgesState(edges);
  const flowRef = useRef<HTMLDivElement>(null);

  // Sync when parent pushes new graph data
  useEffect(() => { setRfNodes(nodes); }, [nodes, setRfNodes]);
  useEffect(() => { setRfEdges(edges); }, [edges, setRfEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setRfEdges((eds) => addEdge(connection, eds)),
    [setRfEdges]
  );

  const exportPng = useCallback(() => {
    if (!flowRef.current) return;
    toPng(flowRef.current, { backgroundColor: "#030712" }).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "workflow-diagram.png";
      a.click();
    });
  }, []);

  return (
    <div className="flex-1 relative bg-gray-950" ref={flowRef}>
      {/* Powerline grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(20,184,166,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.07) 1px, transparent 1px),
            radial-gradient(circle, rgba(20,184,166,0.18) 1.5px, transparent 1.5px)
          `,
          backgroundSize: "60px 60px, 60px 60px, 60px 60px",
          backgroundPosition: "0 0, 0 0, 30px 30px",
        }}
      />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        nodeTypes={nodeTypes}
      >
        <Controls className="!bg-slate-800 !border-slate-600 !rounded-xl" />
        <MiniMap
          className="!bg-slate-800 !border-slate-600 !rounded-xl"
          nodeColor={(n) => (n.style?.background as string) ?? "#34495E"}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Export button */}
      <button
        onClick={exportPng}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors shadow-lg"
      >
        <Download size={13} />
        Export PNG
      </button>

      {/* Legend */}
      <div className="absolute bottom-16 right-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 min-w-[180px] shadow-xl">
        <p suppressHydrationWarning className="text-xs font-semibold text-teal-400 uppercase tracking-wide mb-3">
          Node Types
        </p>
        {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-slate-300 capitalize">{type}</span>
          </div>
        ))}
        <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide mt-3 mb-2">
          Edge Styles
        </p>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 border-t border-slate-400" />
          <span className="text-xs text-slate-300">Solid — direct flow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 border-t border-dashed border-slate-400" />
          <span className="text-xs text-slate-300">Dashed — async/fetch</span>
        </div>
      </div>

      {rfNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-slate-600 text-lg font-medium">No graph yet</p>
            <p className="text-slate-700 text-sm mt-1">
              Describe a system in the left panel to generate a diagram
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
