'use client';
import dagre from '@dagrejs/dagre';
import { Node, Edge, Position } from '@xyflow/react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 320;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 140, nodesep: 100 });

  const visibleNodes = nodes.filter(n => !n.hidden);
  const visibleEdges = edges.filter(e => {
    const sourceVisible = visibleNodes.some(n => n.id === e.source);
    const targetVisible = visibleNodes.some(n => n.id === e.target);
    return sourceVisible && targetVisible;
  });

  visibleNodes.forEach((node) => {
    let individualNodeHeight = 60;
    const title = (node.data as { title?: string })?.title || '';
    if (title.length > 18) {
      individualNodeHeight += (Math.ceil(title.length / 18) - 1) * 18;
    }
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: individualNodeHeight });
  });

  visibleEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: Node[] = nodes.map((node) => {
    if (node.hidden) {
      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        position: node.position || { x: 0, y: 0 }, 
      };
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    
    if (!nodeWithPosition) {
      return node;
    }

    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - 60 / 2,
        // y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
