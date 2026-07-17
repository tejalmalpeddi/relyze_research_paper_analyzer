'use client';
import { useEffect, useState, useCallback } from 'react';
import { ReactFlow, type Node, type Edge, Position } from '@xyflow/react';
import PaperNode from './paper-node';
import { getLayoutedElements } from './node-layout';
import '@xyflow/react/dist/style.css';

const nodeTypes = { paper: PaperNode };

const toggleNodesVisibility = (parentNodeId: string, currentNodes: Node[], currentEdges: Edge[]) => {
    const targetNode = currentNodes.find(n => n.id === parentNodeId);
    if (!targetNode) return currentNodes;

    const shouldExpand = !targetNode.data?.isExpanded;

    let updatedNodes = currentNodes.map(n =>
        n.id === parentNodeId ? { ...n, data: { ...n.data, isExpanded: shouldExpand } } : n
    );

    if (shouldExpand) {
        //shows immediate children
        const immediateChildIds = currentEdges
            .filter(edge => edge.source === parentNodeId)
            .map(edge => edge.target);

        updatedNodes = updatedNodes.map(node => {
            if (immediateChildIds.includes(node.id)) {
                return { ...node, hidden: false };
            }
            return node;
        });
    } else {
        //hides all children
        const queue: string[] = [];
        currentEdges.forEach(edge => {
            if (edge.source === parentNodeId) queue.push(edge.target);
        });

        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentNodeId = queue.shift()!;
            if (visited.has(currentNodeId)) continue;
            visited.add(currentNodeId);

            updatedNodes = updatedNodes.map(node => {
                if (node.id === currentNodeId) {
                    return { ...node, hidden: true, data: { ...node.data, isExpanded: false } };
                }
                return node;
            });

            currentEdges.forEach(edge => {
                if (edge.source === currentNodeId) queue.push(edge.target);
            });
        }
    }

    //call node layout; updates to new layout with newly shown nodes
    const { nodes: layoutedNodes } = getLayoutedElements(updatedNodes, currentEdges);
    return layoutedNodes;
};


export default function Map() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // useCallback
    const handleNodeExpand = useCallback((nodeId: string) => {
        setNodes((currentNodes) => {
            // toggles node collapsing and expanding
            return toggleNodesVisibility(nodeId, currentNodes, edges);
        });
    }, [edges]);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/sample-map')
            .then((res) => res.json())
            .then((data) => {
                const targetNodeIds = new Set(data.edges.map((edge: any) => edge.target));
                const sourceNodeIds = new Set(data.edges.map((edge: any) => edge.source));

                const rootNodeIds = [...sourceNodeIds].filter(id => !targetNodeIds.has(id));
                const childrenOfRoot = new Set(data.edges
                    .filter((edge: any) => edge.source === rootNodeIds[0])
                    .map((edge: any) => edge.target));

                const initializedNodes = data.nodes.map((node: any): Node => {
                    const isRootParent = !targetNodeIds.has(node.id);
                    const isMiddleNode = childrenOfRoot.has(node.id);
                    const isLeafNode = !sourceNodeIds.has(node.id) && !isMiddleNode;
                    const childrenOfNode = new Set(data.edges
                        .filter((edge: any) => edge.source === node.id)
                        .map((edge: any) => edge.target))

                    let layer = 1;
                    let hasChild = childrenOfNode.size > 0;
                    if (isRootParent) {
                        layer = 0;
                    } else if (isLeafNode) {
                        layer = 2;
                    }
                    return {
                        ...node,
                        hidden: !isRootParent,
                        targetPosition: Position.Left,
                        sourcePosition: Position.Right,
                        data: {
                            ...node.data,
                            layer,
                            hasChild: hasChild,
                            isExpanded: false,
                        }
                    };
                });

                const nodeLayerMap = Object.fromEntries(initializedNodes.map((node: Node) => [node.id, node.data!.layer]));

                const styledEdges = data.edges.map((edge: any): Edge => {
                    const sourceLayer = nodeLayerMap[edge.source];

                    const edgeColor = sourceLayer === 0 ? '#4281a4' : '#c1666b';

                    return {
                        ...edge,
                        style: {
                            stroke: edgeColor,
                            strokeWidth: 5,
                            strokeLinecap: 'round',
                        }
                    };
                });
                const { nodes: layoutedNodes } = getLayoutedElements(initializedNodes, styledEdges);
                setNodes(layoutedNodes);
                setEdges(styledEdges);
            });
    }, []);

    const nodesWithHandlers = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onExpand: handleNodeExpand
        }
    }));

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <ReactFlow
                nodes={nodesWithHandlers}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={{
                    type: 'straight',
                    // style: { stroke: '#4281a4', strokeWidth: 5, strokeLinecap: 'round' },
                }}
                fitView
            />
        </div>
    );
}