// components/MindMap.tsx
//
// EVERY component related to drawing the interactive mind map lives in
// this one file, on purpose (you asked for mind-map components to be
// grouped into a single file, separate from the history components in
// History.tsx). From top to bottom, in the order they appear below:
//
//   colorForDepth        -- picks which color a given tree depth uses.
//   buildChildrenMap /
//   computeDepths         -- the hand-written layout math (this is the
//                            whole "instead of a dagre-style layout
//                            library" story from earlier).
//   PaperNode              -- the single index-card component, registered
//                            with React Flow to draw every node.
//   DifficultyToggle       -- the Beginner / Intermediate / Advanced pill.
//   ZoomControls           -- the two magnifying-glass zoom buttons.
//   MapCanvas               -- wires all of the above together into the
//                            actual <ReactFlow> canvas.
//   MindMapView            -- the piece app/mindmap/page.tsx actually
//                            imports: adds the paper's title header and
//                            the ReactFlowProvider wrapper around MapCanvas.
//
// Same rule as History.tsx: every conditional here is a full if/else
// block building a plain variable, never a one-line ternary or a
// `condition && (...)` shortcut in the JSX.

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { HistoryEntry, MapNode } from "@/lib/types";

// ---------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------
//
// Each "hop" down the tree (root -> level 1, level 1 -> level 2, and so
// on) gets its own color, matching the mockup's blue-then-red pattern. If
// a branch goes deeper than this list has colors for, it simply repeats
// from the start again.
const DEPTH_COLORS: string[] = ["#4C7098", "#A15C5C", "#7C8A52", "#B08A3E"];
// blue, red, 

//depth comes from computeDepths function below
//: string labels output type (hex code is string)
function colorForDepth(depth: number): string { //typescript will ensure input "depth" is a number 
  const paletteLength = DEPTH_COLORS.length;
  const indexIntoPalette = depth % paletteLength; //so more than 3 layers still get a color
  return DEPTH_COLORS[indexIntoPalette];
}

// ---------------------------------------------------------------------
// Layout math
// ---------------------------------------------------------------------

type RawNode = Node & { data: MapNode["data"] };

// Walks every edge once and builds a lookup: "parent id -> list of child
// ids". This is the ONLY place that reads edge.source / edge.target
// directly -- everything else asks this map instead of re-scanning the
// edges list every time.
function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const existingChildren = children.get(edge.source);
    if (existingChildren !== undefined) {
      existingChildren.push(edge.target);
    } else {
      children.set(edge.source, [edge.target]);
    }
  }
  return children;
}

// Figures out how many "hops" each node is from its root, by walking
// outward one ring at a time (breadth-first search -- like ripples
// spreading from a stone dropped in water). A "root" here just means: a
// node that is never listed as anyone's target, i.e. nobody points to it.
function computeDepths(nodes: RawNode[], edges: Edge[]): Map<string, number> {
  const incoming = new Set(edges.map((edge) => edge.target));
  const children = buildChildrenMap(edges);
  const depthById = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [];

  for (const node of nodes) {
    if (incoming.has(node.id) === false) {
      queue.push({ id: node.id, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }
    if (depthById.has(current.id) === true) {
      continue; // already visited via a shorter path
    }
    depthById.set(current.id, current.depth);
    const childIds = children.get(current.id);
    if (childIds !== undefined) {
      for (const childId of childIds) {
        queue.push({ id: childId, depth: current.depth + 1 });
      }
    }
  }

  return depthById;
}

// ---------------------------------------------------------------------
// PaperNode
// ---------------------------------------------------------------------

export interface PaperNodeData extends Record<string, unknown> {
  title: string;
  bullets?: string[];
  hasChildren: boolean;
  isExpanded: boolean;
  childCount: number;
  incomingColor?: string;
  expandColor?: string;
  onToggleChildren?: () => void;
}

type PaperFlowNode = Node<PaperNodeData, "paper">;

function PaperNode({ data }: NodeProps<PaperFlowNode>) {
  // Whether THIS card's own description paragraph is currently showing.
  // Local to this one card -- completely separate from whether its
  // CHILDREN are visible, which is decided up in MapCanvas instead.
  const [isContentOpen, setIsContentOpen] = useState(false);

  function handleContentToggleClick() {
    if (isContentOpen === true) {
      setIsContentOpen(false);
    } else {
      setIsContentOpen(true);
    }
  }

  function handleExpandChildrenClick() {
    if (data.onToggleChildren) {
      data.onToggleChildren();
    }
  }

  const hasBullets = data.bullets !== undefined && data.bullets.length > 0;

  let descriptionPanel: React.ReactNode = null;
  if (isContentOpen === true && hasBullets === true) {
    descriptionPanel = (
      <div className="border-t border-stone-300 bg-stone-100 px-4 py-3 font-serif text-sm leading-relaxed text-stone-800">
        {data.bullets!.join(" ")}
      </div>
    );
  }

  // Three distinct, spelled-out cases for the right-edge badge, instead
  // of a nested ternary.
  let expandBadge: React.ReactNode = null;
  if (data.hasChildren === true && data.isExpanded === false) {
    expandBadge = (
      <button
        type="button"
        onClick={handleExpandChildrenClick}
        aria-label={`Reveal ${data.childCount} more topics`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-xs font-semibold text-white"
        style={{ backgroundColor: data.expandColor }}
      >
        {data.childCount}
      </button>
    );
  } else if (data.hasChildren === true && data.isExpanded === true) {
    expandBadge = (
      <button
        type="button"
        onClick={handleExpandChildrenClick}
        aria-label="Hide these topics again"
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: data.expandColor }}
      />
    );
  } else {
    expandBadge = null;
  }

  let incomingHandle: React.ReactNode = null;
  if (data.incomingColor !== undefined) {
    incomingHandle = (
      <Handle
        type="target"
        position={Position.Left}
        style={{
          backgroundColor: data.incomingColor,
          width: 10,
          height: 10,
          border: "2px solid #ffffff",
        }}
      />
    );
  }

  let outgoingHandle: React.ReactNode = null;
  if (data.hasChildren === true) {
    outgoingHandle = (
      <Handle
        type="source"
        position={Position.Right}
        style={{ backgroundColor: "transparent", border: "none", width: 1, height: 1 }}
      />
    );
  }

  return (
    <div className="w-80 overflow-hidden rounded-sm shadow-lg">
      {incomingHandle}

      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
        <span className="font-serif text-base text-stone-900">{data.title}</span>
        {expandBadge}
      </div>

      {descriptionPanel}

      <button
        type="button"
        onClick={handleContentToggleClick}
        aria-label="Toggle description"
        className="flex w-full items-center justify-center bg-stone-200 py-2 hover:bg-stone-300"
      >
        {/* The real chevron.svg asset, flipped upside-down with a CSS
            rotation when the description is open, instead of swapping
            between two different unicode characters. */}
        <Image
          src="/icons/chevron.svg"
          alt=""
          width={20}
          height={8}
          className={isContentOpen === true ? "rotate-180" : ""}
        />
      </button>

      {outgoingHandle}
    </div>
  );
}

// ---------------------------------------------------------------------
// DifficultyToggle
// ---------------------------------------------------------------------
//
// Honesty note, same as before: this only changes which option is
// highlighted on screen right now. There is no generation pipeline built
// yet that reads this value and produces a simpler or more detailed map
// because of it.
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

interface DifficultyToggleProps {
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
}

function DifficultyToggle({ selectedLevel, onSelectLevel }: DifficultyToggleProps) {
  const levelOptions: { value: DifficultyLevel; label: string }[] = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-[#5b4636] p-1 font-serif text-sm">
      {levelOptions.map((option) => {
        let isSelected: boolean;
        if (option.value === selectedLevel) {
          isSelected = true;
        } else {
          isSelected = false;
        }

        let buttonClassName: string;
        if (isSelected === true) {
          buttonClassName = "rounded-full bg-[#d9b48f] px-3 py-1 text-stone-900";
        } else {
          buttonClassName = "rounded-full px-3 py-1 text-stone-300 hover:text-white";
        }

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectLevel(option.value)}
            className={buttonClassName}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// ZoomControls
// ---------------------------------------------------------------------
//
// Hand-styled to match the mockup's two plain magnifying-glass icons,
// instead of React Flow's default corner toolbar. This does NOT
// reimplement zooming -- zoomIn()/zoomOut() are the exact same functions
// React Flow's own <Controls /> would have called internally.
function ZoomControls() {
  const { zoomIn, zoomOut } = useReactFlow();

  function handleZoomInClick() {
    zoomIn();
  }

  function handleZoomOutClick() {
    zoomOut();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleZoomInClick}
        aria-label="Zoom in"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400 text-stone-200 hover:border-white hover:text-white"
      >
        <MagnifyingGlassIcon showPlus={true} />
      </button>
      <button
        type="button"
        onClick={handleZoomOutClick}
        aria-label="Zoom out"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400 text-stone-200 hover:border-white hover:text-white"
      >
        <MagnifyingGlassIcon showPlus={false} />
      </button>
    </div>
  );
}

function MagnifyingGlassIcon({ showPlus }: { showPlus: boolean }) {
  let innerMark: React.ReactNode;
  if (showPlus === true) {
    innerMark = (
      <>
        <line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" strokeWidth="1.4" />
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.4" />
      </>
    );
  } else {
    innerMark = <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.4" />;
  }

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.4" />
      {innerMark}
    </svg>
  );
}

// ---------------------------------------------------------------------
// MapCanvas
// ---------------------------------------------------------------------

const LAYER_WIDTH = 420; // horizontal gap between one depth level and the next
const ROW_HEIGHT = 150; // vertical gap between sibling nodes at the same depth

const nodeTypes = { paper: PaperNode };

interface MapCanvasProps {
  entry: HistoryEntry;
}

function MapCanvas({ entry }: MapCanvasProps) {
  const rawNodes = useMemo(() => entry.map_json.nodes as RawNode[], [entry]);
  const edges = useMemo(() => entry.map_json.edges as Edge[], [entry]);

  const { fitView } = useReactFlow();

  const children = useMemo(() => buildChildrenMap(edges), [edges]);
  const depths = useMemo(() => computeDepths(rawNodes, edges), [rawNodes, edges]);
  const rootIds = useMemo(() => {
    const incoming = new Set(edges.map((edge) => edge.target));
    const foundRootIds: string[] = [];
    for (const node of rawNodes) {
      if (incoming.has(node.id) === false) {
        foundRootIds.push(node.id);
      }
    }
    return foundRootIds;
  }, [rawNodes, edges]);

  // Only the root(s) are visible until the user clicks to expand.
  // Resets to empty automatically whenever a different paper is opened,
  // via the key={entry.id} trick in MindMapView below.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>("beginner");

  function toggleExpand(id: string) {
    setExpandedIds((previousExpandedIds) => {
      const nextExpandedIds = new Set(previousExpandedIds);
      if (nextExpandedIds.has(id) === true) {
        nextExpandedIds.delete(id);
      } else {
        nextExpandedIds.add(id);
      }
      return nextExpandedIds;
    });
  }

  const visibleIds = useMemo(() => {
    const visited = new Set<string>();
    const queue = [...rootIds];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) {
        continue;
      }
      if (visited.has(id) === true) {
        continue;
      }
      visited.add(id);
      if (expandedIds.has(id) === true) {
        const childIds = children.get(id);
        if (childIds !== undefined) {
          for (const childId of childIds) {
            if (visited.has(childId) === false) {
              queue.push(childId);
            }
          }
        }
      }
    }
    return visited;
  }, [rootIds, children, expandedIds]);

  const { nodes, visibleEdges } = useMemo(() => {
    const rowByDepth = new Map<number, number>();
    const positioned: Node<PaperNodeData>[] = [];

    for (const node of rawNodes) {
      if (visibleIds.has(node.id) === false) {
        continue;
      }

      const depth = depths.get(node.id) ?? 0;
      const rowInThisColumn = rowByDepth.get(depth) ?? 0;
      rowByDepth.set(depth, rowInThisColumn + 1);

      const childIds = children.get(node.id);
      let childCount = 0;
      if (childIds !== undefined) {
        childCount = childIds.length;
      }

      let incomingColor: string | undefined;
      if (depth > 0) {
        incomingColor = colorForDepth(depth - 1);
      } else {
        incomingColor = undefined;
      }

      positioned.push({
        id: node.id,
        type: "paper",
        position: { x: depth * LAYER_WIDTH, y: rowInThisColumn * ROW_HEIGHT },
        data: {
          title: node.data.title,
          bullets: node.data.bullets,
          hasChildren: childCount > 0,
          isExpanded: expandedIds.has(node.id),
          childCount: childCount,
          incomingColor: incomingColor,
          expandColor: colorForDepth(depth),
          onToggleChildren: () => toggleExpand(node.id),
        },
      });
    }

    const filteredEdges: Edge[] = [];
    for (const edge of edges) {
      if (visibleIds.has(edge.source) === true && visibleIds.has(edge.target) === true) {
        const sourceDepth = depths.get(edge.source) ?? 0;
        filteredEdges.push({
          ...edge,
          style: { stroke: colorForDepth(sourceDepth), strokeWidth: 2 },
        });
      }
    }

    return { nodes: positioned, visibleEdges: filteredEdges };
  }, [rawNodes, edges, visibleIds, depths, children, expandedIds]);

  useEffect(() => {
    fitView({ duration: 200 });
  }, [nodes, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={visibleEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      style={{
        backgroundImage: "url(/background/corkboard.jpg)",
        backgroundSize: "cover",
      }}
    >
      {/* Bottom-left: difficulty toggle + zoom controls, matching the
          mockup. The "+" add-topic sticky note from the mockup is
          intentionally left out for now -- there's no "add a topic by
          hand" feature built yet. */}
      <Panel position="bottom-left">
        <div className="flex items-center gap-4">
          <DifficultyToggle selectedLevel={selectedLevel} onSelectLevel={setSelectedLevel} />
          <ZoomControls />
        </div>
      </Panel>
    </ReactFlow>
  );
}

// ---------------------------------------------------------------------
// MindMapView
// ---------------------------------------------------------------------
//
// The piece app/mindmap/page.tsx actually imports. Adds the paper-title
// header, and wraps MapCanvas in the ReactFlowProvider it needs in order
// for useReactFlow() (used for fitView/zoomIn/zoomOut) to work at all.
interface MindMapViewProps {
  entry: HistoryEntry;
}

export function MindMapView({ entry }: MindMapViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        {/* key={entry.id} resets all the expand/collapse state (and
            re-triggers layout) whenever a different paper is opened --
            React treats a changed key as "throw this whole subtree away
            and mount a brand new one," which conveniently also throws
            away MapCanvas's useState(expandedIds). */}
        <ReactFlowProvider key={entry.id}>
          <MapCanvas entry={entry} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
