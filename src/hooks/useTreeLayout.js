import { useMemo } from 'react';
import dagre from 'dagre';
import { buildTreeNodes, buildTreeEdges } from '../utils/treeUtils';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 80;

/**
 * Custom hook to calculate tree layout using dagre
 * @param {Object} messagesMap - Map of all messages
 * @param {string[]} rootMessageIds - Array of root message IDs
 * @param {string[]} currentBranchPath - Current branch path
 * @returns {Object} Object containing nodes and edges
 */
const useTreeLayout = (messagesMap, rootMessageIds, currentBranchPath) => {
  const { nodes, edges } = useMemo(() => {
    if (!messagesMap || Object.keys(messagesMap).length === 0) {
      return { nodes: [], edges: [] };
    }

    // Build nodes and edges
    const rawNodes = buildTreeNodes(messagesMap, rootMessageIds, currentBranchPath);
    const rawEdges = buildTreeEdges(messagesMap);

    // Create dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: 'TB', // Top to Bottom
      ranksep: 80, // Vertical spacing between ranks
      nodesep: 50, // Horizontal spacing between nodes
      edgesep: 30,
      marginx: 20,
      marginy: 20,
    });

    // Add nodes to dagre graph
    rawNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Add edges to dagre graph
    rawEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Apply calculated positions to nodes
    const layoutedNodes = rawNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
      };
    });

    // Update edge styles for current branch
    const layoutedEdges = rawEdges.map((edge) => {
      const isInCurrentBranch =
        currentBranchPath.includes(edge.source) &&
        currentBranchPath.includes(edge.target) &&
        currentBranchPath.indexOf(edge.target) === currentBranchPath.indexOf(edge.source) + 1;

      return {
        ...edge,
        animated: isInCurrentBranch,
        style: {
          ...edge.style,
          stroke: isInCurrentBranch ? '#1976d2' : '#999',
          strokeWidth: isInCurrentBranch ? 3 : 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [messagesMap, rootMessageIds, currentBranchPath]);

  return { nodes, edges };
};

export default useTreeLayout;
