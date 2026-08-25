"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { EB_Garamond } from "next/font/google";
import dagre from "@dagrejs/dagre";
import {
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    useNodesState,
    useEdgesState,
    Panel,
    Node,
    Edge,
    Handle,
    Position,
    NodeProps,
    EdgeProps,
    useStore,
    OnNodesDelete,
    getStraightPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { HistoryEntry, MapNode, StickyNoteEntry } from "@/lib/types";
import { StickyNoteNode, StickyNoteData } from "./StickyNote";
import { StickyToolbar } from "./StickyNoteToolbar";
import { fetchStickyNotes, createStickyNotes, editStickyNotes, clearStickyNotes } from "@/lib/api";
import DifficultySelect, { type Difficulty } from "@/components/difficulty-select/DifficultySelect";

const ebGaramond = EB_Garamond({
    weight: ["400"],
    subsets: ["latin"],
});

const DEPTH_COLORS: string[] = ["#4281a4", "#c1666b", "#7C8A52", "#B08A3E"];

function colorForDepth(depth: number): string {
    const indexIntoPalette = depth % DEPTH_COLORS.length;
    return DEPTH_COLORS[indexIntoPalette];
}

function getCssFilterForColor(color: string): string {
    const BLACKEN = "brightness(0) saturate(100%) ";

    switch (color.toLowerCase()) {
        case "#4281a4":
            return BLACKEN + "invert(48%) sepia(21%) saturate(1000%) hue-rotate(161deg) brightness(91%) contrast(88%)";
        case "#c1666b":
            return BLACKEN + "invert(52%) sepia(21%) saturate(1400%) hue-rotate(300deg) brightness(85%) contrast(85%)";
        case "#7c8a52":
            return BLACKEN + "invert(55%) sepia(25%) saturate(700%) hue-rotate(40deg) brightness(90%) contrast(85%)";
        case "#b08a3e":
            return BLACKEN + "invert(58%) sepia(40%) saturate(800%) hue-rotate(5deg) brightness(90%) contrast(90%)";
        default:
            return BLACKEN + "invert(50%)";
    }
}

const NODE_WIDTH = 320;
const EDGE_ANIMATION_MS = 650;

type AnimatedEdgeData = {
    animationState?: "expand" | "retract";
};

function getEdgeKey(edge: Pick<Edge, "source" | "target">): string {
    return `${edge.source}->${edge.target}`;
}

function AnimatedStraightEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    data,
}: EdgeProps<Edge<AnimatedEdgeData>>) {
    const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    const animationName =
        data?.animationState === "retract"
            ? "mind-map-edge-retract"
            : data?.animationState === "expand"
                ? "mind-map-edge-expand"
                : undefined;

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            pathLength={1}
            style={{
                ...style,
                animation: animationName ? `${animationName} ${EDGE_ANIMATION_MS}ms ease-in-out both` : undefined,
                strokeDasharray: animationName ? 1 : undefined,
            }}
        />
    );
}

function layoutNodesWithDagre(
    nodesToLayout: Node<PaperNodeData>[],
    edgesToLayout: Edge[]
): Node<PaperNodeData>[] {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", ranksep: 140, nodesep: 80 });

    nodesToLayout.forEach((node) => {
        let height = 100;
        const title = node.data.title || "";
        if (title.length > 18) {
            height += (Math.ceil(title.length / 18) - 1) * 18;
        }
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height });
    });

    edgesToLayout.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodesToLayout.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if (!nodeWithPosition) return node;

        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - nodeWithPosition.height / 2,
            },
        };
    });
}

type RawNode = Node & { data: MapNode["data"]; content?: MapNode["content"] };

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
        if (current === undefined) continue;

        if (depthById.has(current.id) === true) continue;

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

export interface PaperNodeData extends Record<string, unknown> {
    title: string;
    bullets?: string[];
    depth: number;
    isExpanded: boolean;
    childCount: number;
    animationState?: "appear" | "disappear";
    handleColor?: string;
    expandColor?: string;
    onToggleChildren?: () => void;
}

type PaperFlowNode = Node<PaperNodeData, "paper">;

function PaperNode({ data }: NodeProps<PaperFlowNode>) {
    const [showSummary, setShowSummary] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const CIRCLE_SIZE = "32px";
    const CIRCLE_TOP_POSITION = "35px";
    const GRAY = "#e5e5e5";
    const WHITE = "#f4f4f4";

    const isRoot = data.depth === 0;

    const leftHandleColor = data.handleColor || colorForDepth(Math.max(0, data.depth - 1));
    const rightHandleColor = data.expandColor || colorForDepth(data.depth);

    const chevronFilter = getCssFilterForColor(rightHandleColor);

    function handleExpandClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (data.onToggleChildren) {
            data.onToggleChildren();
        }
    }

    return (
        <div
            style={{
                borderRadius: "3px",
                background: "#fff",
                border: "1px solid #ddd",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                width: "320px",
                fontFamily: ebGaramond.style.fontFamily,
                boxSizing: "border-box",
                height: "auto",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                animation:
                    data.animationState === "appear"
                        ? `mind-map-node-appear ${EDGE_ANIMATION_MS}ms ease-in-out both`
                        : data.animationState === "disappear"
                            ? `mind-map-node-disappear ${EDGE_ANIMATION_MS}ms ease-in-out both`
                            : undefined,
            }}
        >
            {!isRoot && (
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        top: CIRCLE_TOP_POSITION,
                        transform: "translateY(-50%)",
                        background: leftHandleColor,
                        width: CIRCLE_SIZE,
                        height: CIRCLE_SIZE,
                        border: "none",
                        left: `calc((${CIRCLE_SIZE} / 2) * -1)`,
                        zIndex: 10,
                    }}
                />
            )}

            <div style={{ padding: "25px 12px 25px 12px", textAlign: "center" }}>
                <p style={{ fontSize: "20px", color: "#111", overflowWrap: "break-word", margin: 0 }}>
                    {data.title}
                </p>
            </div>

            <div
                onClick={() => setShowSummary(!showSummary)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="nodrag nopan"
                style={{
                    cursor: "pointer",
                    borderTop: "0.5px solid #242323",
                    background: isHovered ? WHITE : GRAY,
                    color: "#333",
                    padding: "12px",
                    fontSize: "11px",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transition: "background 0.15s ease",
                    boxSizing: "border-box",
                    outline: "none",
                    flexDirection: "column",
                }}
            >
                {showSummary && data.bullets && data.bullets.length > 0 && (
                    <div
                        style={{
                            padding: "4px",
                            maxHeight: "100px",
                            overflowY: "auto",
                            width: "100%",
                            boxSizing: "border-box",
                        }}
                        className="nowheel"
                    >
                        <ul
                            style={{
                                margin: 0,
                                listStyleType: "none",
                                paddingLeft: "3px",
                                fontSize: "16px",
                                textAlign: "left",
                                width: "100%",
                            }}
                        >
                            {data.bullets.map((bullet, index) => (
                                <li key={index} style={{ paddingBottom: "6px", overflowWrap: "break-word" }}>
                                    {bullet}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <Image
                    src="/icons/chevron.svg"
                    alt="Toggle summary"
                    width={16}
                    height={8}
                    style={{
                        transform: showSummary ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                    }}
                />
            </div>

            {(data.childCount > 0) && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="nodrag nopan"
                    style={{
                        top: CIRCLE_TOP_POSITION,
                        transform: "translateY(-50%)",
                        background: rightHandleColor,
                        width: CIRCLE_SIZE,
                        height: CIRCLE_SIZE,
                        border: "none",
                        right: `calc((${CIRCLE_SIZE} / 2) * -1)`,
                        zIndex: 10,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "12px",
                    }}
                    onClick={handleExpandClick}
                >
                    <span style={{ userSelect: "none", pointerEvents: "none" }}>
                        {data.isExpanded ? " " : <div style={{
                            display: "flex",
                            alignItems: "center",
                        }}>
                            <p style={{ margin: 0, padding: 0, lineHeight: 1 }}>{data.childCount}</p>
                            <img
                                src="/icons/chevron.svg"
                                alt="Expand"
                                style={{
                                    transform: "rotate(-90deg)",
                                    right: `calc((${CIRCLE_SIZE} * -0.75))`,
                                    position: "absolute",
                                    filter: chevronFilter
                                }}
                            /></div>}
                    </span>
                </Handle>
            )}
        </div>
    );
}

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

function toDifficulty(level: DifficultyLevel): Difficulty {
  return (level.charAt(0).toUpperCase() + level.slice(1)) as Difficulty;
}

function toDifficultyLevel(difficulty: Difficulty): DifficultyLevel {
  return difficulty.toLowerCase() as DifficultyLevel;
}


function ZoomControls() {
    const { zoomIn, zoomOut } = useReactFlow();

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-400 text-stone-200 hover:border-white hover:text-white"
            >
                <MagnifyingGlassIcon showPlus={true} />
            </button>
            <button
                type="button"
                onClick={() => zoomOut()}
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

const nodeTypes = {
    paper: PaperNode,
    stickyNote: StickyNoteNode,
};

const edgeTypes = {
    animatedStraight: AnimatedStraightEdge,
};

interface MapCanvasProps {
    entry: HistoryEntry;
    selectedLevel?: DifficultyLevel;
    onSelectLevel?: (level: DifficultyLevel) => void;
}

function MapCanvas({ entry, selectedLevel: controlledLevel, onSelectLevel }: MapCanvasProps) {
    const rawNodes = useMemo(() => entry.map_json.nodes as RawNode[], [entry]);
    const edges = useMemo(() => entry.map_json.edges as Edge[], [entry]);

    const { fitView, screenToFlowPosition } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [visibleEdges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [internalSelectedLevel, setInternalSelectedLevel] = useState<DifficultyLevel>("beginner");
    const selectedLevel = controlledLevel ?? internalSelectedLevel;
    const setSelectedLevel = onSelectLevel ?? setInternalSelectedLevel;
    const [renderedVisibleIds, setRenderedVisibleIds] = useState<Set<string>>(() => new Set(rootIds));
    const [expandingEdgeIds, setExpandingEdgeIds] = useState<Set<string>>(new Set());
    const [retractingEdgeIds, setRetractingEdgeIds] = useState<Set<string>>(new Set());
    const [appearingNodeIds, setAppearingNodeIds] = useState<Set<string>>(new Set());
    const [disappearingNodeIds, setDisappearingNodeIds] = useState<Set<string>>(new Set());
    const [retractTimerId, setRetractTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

    const [placingColor, setPlacingColor] = useState<string | null>(null);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const zoom = useStore((state) => state.transform[2]);

    useEffect(() => {
        return () => {
            if (retractTimerId !== null) {
                clearTimeout(retractTimerId);
            }
        };
    }, [retractTimerId]);

    const getVisibleIdsForExpandedIds = useCallback((expandedIdSet: Set<string>): Set<string> => {
        const visited = new Set<string>();
        const queue = [...rootIds];
        while (queue.length > 0) {
            const id = queue.shift();
            if (id === undefined) continue;
            if (visited.has(id) === true) continue;

            visited.add(id);
            if (expandedIdSet.has(id) === true) {
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
    }, [rootIds, children]);

    const getDescendantIds = useCallback((id: string): Set<string> => {
        const descendants = new Set<string>();
        const queue = [...(children.get(id) ?? [])];
        while (queue.length > 0) {
            const childId = queue.shift();
            if (childId === undefined || descendants.has(childId)) continue;

            descendants.add(childId);
            queue.push(...(children.get(childId) ?? []));
        }
        return descendants;
    }, [children]);

    const animateRenderedVisibility = useCallback((nextVisibleIds: Set<string>) => {
        if (retractTimerId !== null) {
            clearTimeout(retractTimerId);
            setRetractTimerId(null);
        }

        const enteringNodeIds = new Set([...nextVisibleIds].filter((id) => renderedVisibleIds.has(id) === false));
        const leavingNodeIds = new Set([...renderedVisibleIds].filter((id) => nextVisibleIds.has(id) === false));
        const hasAnimation = enteringNodeIds.size > 0 || leavingNodeIds.size > 0;

        if (hasAnimation === false) {
            setAppearingNodeIds(new Set());
            setDisappearingNodeIds(new Set());
            setExpandingEdgeIds(new Set());
            setRetractingEdgeIds(new Set());
            setRenderedVisibleIds(nextVisibleIds);
            return;
        }

        const nextExpandingEdgeIds = new Set<string>();
        const nextRetractingEdgeIds = new Set<string>();
        for (const edge of edges) {
            const isRendered = renderedVisibleIds.has(edge.source) && renderedVisibleIds.has(edge.target);
            const willRemain = nextVisibleIds.has(edge.source) && nextVisibleIds.has(edge.target);
            if (!isRendered && willRemain) {
                nextExpandingEdgeIds.add(getEdgeKey(edge));
            }
            if (isRendered && !willRemain) {
                nextRetractingEdgeIds.add(getEdgeKey(edge));
            }
        }

        setAppearingNodeIds(enteringNodeIds);
        setDisappearingNodeIds(leavingNodeIds);
        setExpandingEdgeIds(nextExpandingEdgeIds);
        setRetractingEdgeIds(nextRetractingEdgeIds);
        setRenderedVisibleIds(new Set([...renderedVisibleIds, ...nextVisibleIds]));
        const nextRetractTimerId = setTimeout(() => {
            setRenderedVisibleIds(nextVisibleIds);
            setAppearingNodeIds(new Set());
            setDisappearingNodeIds(new Set());
            setExpandingEdgeIds(new Set());
            setRetractingEdgeIds(new Set());
            setRetractTimerId(null);
        }, EDGE_ANIMATION_MS);
        setRetractTimerId(nextRetractTimerId);
    }, [edges, renderedVisibleIds, retractTimerId]);

    const toggleExpand = useCallback((id: string) => {
        const nextExpandedIds = new Set(expandedIds);
        const descendantIds = getDescendantIds(id);
        if (nextExpandedIds.has(id) === true) {
            nextExpandedIds.delete(id);
            for (const descendantId of descendantIds) {
                nextExpandedIds.delete(descendantId);
            }
        } else {
            nextExpandedIds.add(id);
        }

        setExpandedIds(nextExpandedIds);
        animateRenderedVisibility(getVisibleIdsForExpandedIds(nextExpandedIds));
    }, [animateRenderedVisibility, expandedIds, getDescendantIds, getVisibleIdsForExpandedIds]);

    const { layoutedMindMapNodes, visibleEdge } = useMemo(() => {
        const unpositionedNodes: Node<PaperNodeData>[] = [];

        for (const node of rawNodes) {
            if (renderedVisibleIds.has(node.id) === false) continue;

            const depth = depths.get(node.id) ?? 0;
            const childIds = children.get(node.id);
            const childCount = childIds !== undefined ? childIds.length : 0;

            const levelBullets = node.content ? [node.content[selectedLevel]] : node.data.bullets;

            unpositionedNodes.push({
                id: node.id,
                type: "paper",
                position: { x: 0, y: 0 },
                data: {
                    title: node.data.title,
                    bullets: levelBullets,
                    depth: depth,
                    isExpanded: expandedIds.has(node.id),
                    childCount: childCount,
                    animationState: disappearingNodeIds.has(node.id)
                        ? "disappear"
                        : appearingNodeIds.has(node.id)
                            ? "appear"
                            : undefined,
                    handleColor: depth > 0 ? colorForDepth(depth - 1) : undefined,
                    expandColor: colorForDepth(depth),
                    onToggleChildren: () => toggleExpand(node.id),
                },
            });
        }

        const filteredEdges: Edge[] = [];
        for (const edge of edges) {
            if (renderedVisibleIds.has(edge.source) === true && renderedVisibleIds.has(edge.target) === true) {
                const sourceDepth = depths.get(edge.source) ?? 0;
                filteredEdges.push({
                    ...edge,
                    type: "animatedStraight",
                    data: {
                        animationState: retractingEdgeIds.has(getEdgeKey(edge))
                            ? "retract"
                            : expandingEdgeIds.has(getEdgeKey(edge))
                                ? "expand"
                                : undefined,
                    },
                    style: {
                        stroke: colorForDepth(sourceDepth),
                        strokeWidth: 5,
                        strokeLinecap: "round",
                    },
                });
            }
        }

        const layoutedNodes = layoutNodesWithDagre(unpositionedNodes, filteredEdges);
        return { layoutedMindMapNodes: layoutedNodes, visibleEdge: filteredEdges };
    }, [
        rawNodes,
        edges,
        renderedVisibleIds,
        depths,
        children,
        expandedIds,
        selectedLevel,
        expandingEdgeIds,
        retractingEdgeIds,
        appearingNodeIds,
        disappearingNodeIds,
        toggleExpand,
    ]);

    useEffect(() => {
        async function loadAndSyncNodes() {
            let fetchedStickyNodes: Node<StickyNoteData>[] = [];

            if (entry?.id) {
                try {
                    const data = await fetchStickyNotes(entry.id);
                    if (Array.isArray(data)) {
                        fetchedStickyNodes = data.map((item: StickyNoteEntry) => ({
                            id: `sticky-${item.id || Math.random()}`,
                            type: "stickyNote",
                            position: { x: item.position_x ?? 0, y: item.position_y ?? 0 },
                            data: {
                                content: item.content ?? "",
                                color: item.color ?? "#4281a4",
                                isEditing: false,
                                documentId: entry.id,
                            },
                        }));
                    }
                } catch (error) {
                    console.error("Failed to load sticky notes:", error);
                }
            }

            setNodes([...fetchedStickyNodes, ...layoutedMindMapNodes]);
        }

        loadAndSyncNodes();
    }, [entry?.id, layoutedMindMapNodes, setNodes]);

    useEffect(() => {
        setEdges(visibleEdge);
    }, [visibleEdge, setEdges]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!placingColor) return;
        setCursorPos({ x: e.clientX, y: e.clientY });
    };

    const handleCanvasClick = async (e: React.MouseEvent) => {
        if (!placingColor) return;

        const canvasPos = screenToFlowPosition({ x: e.clientX - 104, y: e.clientY - 104 });
        const createdAt = new Date().toISOString();

        try {
            const createdStickyNote = await createStickyNotes(entry.id, {
                color: placingColor,
                content: "",
                position_x: canvasPos.x,
                position_y: canvasPos.y,
                created_at: createdAt,
            });

            const newStickyNode: Node<StickyNoteData> = {
                id: `sticky-${createdStickyNote.id}`,
                type: "stickyNote",
                position: canvasPos,
                data: {
                    content: "",
                    color: placingColor,
                    isEditing: true,
                    documentId: entry.id,
                },
            };

            setNodes((nds) => [...nds, newStickyNode]);
        } catch (error) {
            console.error("Failed to save sticky note:", error);
        }

        setPlacingColor(null);
    };

    const handleNodeDragStop = async (_event: MouseEvent | TouchEvent, node: Node) => {
        if (!node.id.startsWith("sticky-")) return;

        try {
            await editStickyNotes(entry.id, {
                id: node.id.replace("sticky-", ""),
                position_x: node.position.x,
                position_y: node.position.y,
            });
        } catch (error) {
            console.error("Failed to update sticky note position:", error);
        }
    };

    const handleNodeDelete: OnNodesDelete = async (deletedNodes) => {
        for (const node of deletedNodes) {
            if (!node.id.startsWith("sticky-")) continue;
            try {
                await clearStickyNotes(entry.id, node.id.replace("sticky-", ""));
            } catch (error) {
                console.error("Failed to delete sticky note:", error);
            }
        }
    };

    useEffect(() => {
        fitView({ duration: 250 });
    }, [renderedVisibleIds, fitView]);

    return (
        <div
            className="w-full h-full relative"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
        >
            {/* cursor hover */}
            {placingColor && (
                <div
                    style={{
                        left: `${cursorPos.x - (100 * zoom)}px`,
                        top: `${cursorPos.y - (100 * zoom)}px`,
                        width: `${200 * zoom}px`,
                        height: `${200 * zoom}px`,
                        backgroundColor: placingColor,
                    }}
                    className="pointer-events-none fixed z-[99999] w-52 h-52 opacity-70 rounded-lg border-2 border-dashed border-white shadow-2xl flex items-center justify-center text-white font-medium text-xs"
                >

                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={visibleEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={handleNodeDragStop}
                onNodesDelete={handleNodeDelete}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                style={{
                    backgroundImage: "url(/background/corkboard.jpg)",
                    backgroundSize: "cover",
                }}
            >
                <Panel position="bottom-left" className="!z-[9999] pointer-events-auto">
                    <div className="flex items-center gap-4 bg-[#212327]/90 p-2 rounded-full border border-stone-700 backdrop-blur-md shadow-2xl">
                        <br />
                        <DifficultySelect
                        value={toDifficulty(selectedLevel)}
                        onChange={(next) => setSelectedLevel(toDifficultyLevel(next))}
                        />
                        <StickyToolbar
                            activeColor={placingColor}
                            onSelectColor={(color) => setPlacingColor(color)}
                        />
                        <ZoomControls />
                        <br />
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

interface MindMapViewProps {
    entry: HistoryEntry;
    selectedLevel?: DifficultyLevel;
    onSelectLevel?: (level: DifficultyLevel) => void;
}

export function MindMapView({ entry, selectedLevel, onSelectLevel }: MindMapViewProps) {
    return (
        <div className="flex h-full w-full flex-col">
            <div className="flex-1">
                <ReactFlowProvider key={entry.id}>
                    <MapCanvas entry={entry} selectedLevel={selectedLevel} onSelectLevel={onSelectLevel} />
                </ReactFlowProvider>
            </div>
        </div>
    );
}
