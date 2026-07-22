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

//page.tsx: matchedEntry (already fetched, sitting in state)
//    ↓ passed as a prop
// <MindMapView entry={matchedEntry} />
//    ↓ MindMapView receives it as its own `entry` prop
//<MapCanvas entry={entry} />
//    ↓ MapCanvas receives that same object as ITS `entry` prop
//const rawNodes = entry.map_json.nodes as RawNode[];
//const edges = entry.map_json.edges as Edge[];


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

//ex input / output: 
//input edges : [ {source: "A", target: "B"}, {source: "A", target: "C"}, {source: "B", target: "D"} ]
//output: children = { A: ["B", "C"], B: ["D"] }
function buildChildrenMap(edges: Edge[]): Map<string, string[]> { 
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const existingChildren = children.get(edge.source);
    //check if this iteration edge is in children list (source so checks id is there or not)
    if (existingChildren !== undefined) {
      //if id exists, then in associated target list, push that target too  
      existingChildren.push(edge.target);
    } else {
      children.set(edge.source, [edge.target]);
      //if doesn't exist then ex: children = { A: ["B"] }
    }
  }
  return children;
}

//count how many targets per child: depths will be stored in a id to number map object list 
// Figures out how many "hops" each node is from its root, by walking
// outward one ring at a time (breadth-first search -- like ripples
// spreading from a stone dropped in water). A "root" here just means: a
// node that is never listed as anyone's target, i.e. nobody points to it.
function computeDepths(nodes: RawNode[], edges: Edge[]): Map<string, number> {

  // arrow function that transforms edge source target pairs and pulls just targets from each
  //list of targets stored in a set, making it have only unique values 
  //ex: incoming = Set { "B", "C", "D" }
  const incoming = new Set(edges.map((edge) => edge.target));

  //makes edges into this kind of list: { A: ["B", "C"], B: ["D"] }
  const children = buildChildrenMap(edges);

  //empty for actual return of this function
  const depthById = new Map<string, number>();

  //queue: FIFO. depth of each id aka which order to be checked out in line 
  const queue: { id: string; depth: number }[] = [];

  //loop over every node. if it is not alr in set of unique target values, then add it to queue
  //checks if node is ever a target / pointed at by an arrow! 
  //if not, then its added to queue with depth 0! 
  for (const node of nodes) {
    if (incoming.has(node.id) === false) {
      queue.push({ id: node.id, depth: 0 });
    }
  }


  while (queue.length > 0) {
    //removes and returns first item in queue. current is now that {id, depth}
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }

    //if depth recorded for this node alr, then skip 
    if (depthById.has(current.id) === true) {
      continue; // already visited via a shorter path
    }

    //visit node and record depth as current.depth, breadth first search 
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

//react Node, two arguments. first, what shape does data have?: PaperNodeData, and what is node type?: paper 
//paper matches MapCanvas 
type PaperFlowNode = Node<PaperNodeData, "paper">;

//data is from prop, and PaperFlowNode is filled in 
function PaperNode({ data }: NodeProps<PaperFlowNode>) {

  // Whether THIS card's own description paragraph is currently showing.
  // Local to this one card -- completely separate from whether its
  // CHILDREN are visible, which is decided up in MapCanvas instead.

  //false means isContentOpen starts as false. function is only way to flip switch. 
  const [isContentOpen, setIsContentOpen] = useState(false);

  //what happens when chevron clicked, relates to condition of description panel 
  function handleContentToggleClick() {
    if (isContentOpen === true) {
      setIsContentOpen(false);
    } else {
      setIsContentOpen(true);
    }
  }

  //from MapCanvas
  function handleExpandChildrenClick() {
    if (data.onToggleChildren) {
      data.onToggleChildren();
    }
  }

  //if card has bullets and text then become something react can render 
  const hasBullets = data.bullets !== undefined && data.bullets.length > 0;

  //bullet text box aka description panel
  let descriptionPanel: React.ReactNode = null;
  if (isContentOpen === true && hasBullets === true) {
    descriptionPanel = (
      <div className="border-t border-stone-300 bg-stone-100 px-4 py-3 font-serif text-sm leading-relaxed text-stone-800">
        {data.bullets!.join(" ")} {/* Joined array items with space character between */}
      </div>
    );
  }

  // Three distinct, spelled-out cases for the right-edge / expand badge, instead
  // of a nested ternary.
  let expandBadge: React.ReactNode = null;
  if (data.hasChildren === true && data.isExpanded === false) { //if node has children and its collapsed
    expandBadge = (
      <button
        type="button" //HTML clickable button
        onClick={handleExpandChildrenClick} //{} = JS, funtion to call on click
        aria-label={`Reveal ${data.childCount} more topics`} //accessibility attribute

        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-xs font-semibold text-white"
        //button is a flex container, fixed h / w, never shrinks smaller than set size, 
        //center number vertically and horizontally, rounded so circle, font, small text inside circle
        //bold, white text 

        style={{ backgroundColor: data.expandColor }}
        //
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
    //outer card shape with incoming handle is connection dot at side based on earlier
    <div className="w-80 overflow-hidden shadow-lg">
      {incomingHandle} 

      {/*Title row: title and expand badge, description panel with bullet text */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
        <span className="font-serif text-base text-stone-900">{data.title}</span>
        {expandBadge}
      </div>

      {descriptionPanel}

      {/*Clickable chevron*/}
      <button
        type="button"
        onClick={handleContentToggleClick}
        aria-label="Toggle description"
        className="flex w-full items-center justify-center bg-stone-200 py-2 hover:bg-stone-300"
      >
        {/* chevron.svg asset, flipped upside-down with a CSS
            rotation when the description is open*/}
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

        {/*Hand drawn inline SVG for magnifiying glass icon */}
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

//constant spacing math & whenever type is paper, it means use PaperNode function. 
const LAYER_WIDTH = 420; // horizontal gap between one depth level and the next
const ROW_HEIGHT = 150; // vertical gap between sibling nodes at the same depth
const nodeTypes = { paper: PaperNode };

//receives "entry" as prop aka whole HistoryEntry object passed from MindMapView in page.tsx
interface MapCanvasProps {
  entry: HistoryEntry;
}

//entry prop
function MapCanvas({ entry }: MapCanvasProps) {
  //unpack raw data from entry, pull nodes and edges 
  const rawNodes = useMemo(() => entry.map_json.nodes as RawNode[], [entry]);
  const edges = useMemo(() => entry.map_json.edges as Edge[], [entry]);

  //grab React Flow's zoom controls
  const { fitView } = useReactFlow();

  //build tree structure from flat lists computed earlier & prev functions
  //children: node id, which nodes direct children 
  // depths: node id, how many away from root is it 
  // rootIds: which nodes are roots
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
  
  //expandedIds contains no Ids, then expanded roots get added 
  //(1) sets up a private slot of memory that belongs specifically to this component instance, 
  // persisting across re-renders (but wiped if the component unmounts), 
  // and (2) hands back an array with exactly two items in it, always, every time.

  //useState always returns a 2-item array: item 1 is the current remembered value, 
  // item 2 is a function for changing it. const [value, setValue] = ... is array destructuring 
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  //DifficultyToggle component reads and updates this state
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>("beginner");

  //useState function from above here, whatever return becomes val of expandedIds going forward
  //currently holds root "root", which gets put in Set
  //checks if whatever id is param input is in the expandedIds list, if not then state changes 
  //this triggers re-render and visibleIds recomputes since it depends on expandedIds and a new node 
  //has become visible
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

  //given what's currently expanded, which node ids should actually be visible right now
  //BFS to shift nodes into visited upon click, queue is not visited in that tree chain
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
  }, [rootIds, children, expandedIds]); //dependency array: recompute when any of these change 

  //takes tree data from earlier and figures out placement, number badge, colors, and click logic
  const { nodes, visibleEdges } = useMemo(() => {
    const rowByDepth = new Map<number, number>(); //depth number: how many nodes already placed in this col
    const positioned: Node<PaperNodeData>[] = []; //empty list of nodes carrying PaperNode data, pushed into

    //all nodes iterated through, is it in visibleIds? if not, continue to next node
    for (const node of rawNodes) {
      if (visibleIds.has(node.id) === false) {
        continue;
      }

      //if visible, compute node position
      const depth = depths.get(node.id) ?? 0; //get node's depth
      const rowInThisColumn = rowByDepth.get(depth) ?? 0; //get how many nodes alr at this depth
      rowByDepth.set(depth, rowInThisColumn + 1); //update counted for depth in this row 

      //count children for this node
      const childIds = children.get(node.id);
      let childCount = 0;
      if (childIds !== undefined) {
        childCount = childIds.length;
      }

      //node edge color decided on one level higher aka parent depth so root is undef 
      let incomingColor: string | undefined;
      if (depth > 0) {
        incomingColor = colorForDepth(depth - 1);
      } else {
        incomingColor = undefined;
      }

      //this adds one complete object into end of positioned. every node in this list is ready to render
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

    //decides which arrows should be drawn on screen and what color each should be 
    //It only keeps an arrow if both ends of it are currently visible 
    //Every arrow colored based on how deep its starting node is in the tree 
    const filteredEdges: Edge[] = [];
    for (const edge of edges) {
      if (visibleIds.has(edge.source) === true && visibleIds.has(edge.target) === true) {
        const sourceDepth = depths.get(edge.source) ?? 0;
        filteredEdges.push({
          ...edge,
          type: "straight", //makes sure not bezel curve 
          style: { stroke: colorForDepth(sourceDepth), strokeWidth: 2 },
        });
      }
    }

    return { nodes: positioned, visibleEdges: filteredEdges };
  }, [rawNodes, edges, visibleIds, depths, children, expandedIds]);

  //autofit effect from react flow, re-runs based on dependency array
  useEffect(() => {
    fitView({ duration: 200 });
  }, [nodes, fitView]);

  //react flow library component filled in with what we just built
  return (
    <ReactFlow
      nodes={nodes}
      edges={visibleEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true} //highlighting content 
      style={{
        backgroundImage: "url(/background/corkboard.jpg)", //canvas background set
        backgroundSize: "cover", //scale image to fit area
      }}

    //zoom control UI below, bottom left, difficulty level with state passed as props, zoom controls from 
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
