import * as dagre from 'dagre';
import { isEqual } from 'lodash';
import { CustomNode, CustomEdge } from './WecsTopologyInterfaces';

export const getLayoutedElements = (
  nodes: CustomNode[],
  edges: CustomEdge[],
  direction = 'LR',
  prevNodes: React.MutableRefObject<CustomNode[]>,
  currentZoom: number
) => {
  const scaleFactor = Math.max(0.5, Math.min(2.0, currentZoom));
  const NODE_WIDTH = 146 * scaleFactor;
  const NODE_HEIGHT = 30 * scaleFactor;
  const NODE_SEP = 22 * scaleFactor;
  const RANK_SEP = 60 * scaleFactor;
  const CHILD_SPACING = NODE_HEIGHT + 30 * scaleFactor;

  // Step 1: Initial Dagre layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: NODE_SEP, ranksep: RANK_SEP });

  const nodeMap = new Map<string, CustomNode>();
  const newNodes: CustomNode[] = [];

  const shouldRecalculate = true;
  if (!shouldRecalculate && Math.abs(nodes.length - prevNodes.current.length) <= 5) {
    prevNodes.current.forEach(node => nodeMap.set(node.id, node));
  }

  nodes.forEach(node => {
    const cachedNode = nodeMap.get(node.id);
    if (!cachedNode || !isEqual(cachedNode, node) || shouldRecalculate) {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      newNodes.push(node);
    } else {
      newNodes.push({ ...cachedNode, ...node });
    }
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = newNodes.map(node => {
    const dagreNode = dagreGraph.node(node.id);
    return dagreNode
      ? {
          ...node,
          position: {
            x: dagreNode.x - NODE_WIDTH / 2 + 50 * scaleFactor,
            y: dagreNode.y - NODE_HEIGHT / 2 + 50 * scaleFactor,
          },
        }
      : node;
  });

  return applyCustomLayout(
    layoutedNodes,
    edges,
    scaleFactor,
    NODE_WIDTH,
    NODE_HEIGHT,
    CHILD_SPACING
  );
};

const applyCustomLayout = (
  layoutedNodes: CustomNode[],
  edges: CustomEdge[],
  _scaleFactor: number,
  NODE_WIDTH: number,
  NODE_HEIGHT: number,
  CHILD_SPACING: number
) => {
  // Step 2: Build parent-to-children mapping
  const parentToChildren = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!parentToChildren.has(edge.source)) {
      parentToChildren.set(edge.source, new Set());
    }
    parentToChildren.get(edge.source)!.add(edge.target);
  });

  // Step 3: Identify parents with pod children
  const parentsWithPods = new Set<string>();
  const allChildrenToAlign = new Set<string>();

  parentToChildren.forEach((children, parentId) => {
    let hasPodChild = false;
    children.forEach(childId => {
      if (childId.startsWith('pod:')) {
        hasPodChild = true;
      }
    });
    if (hasPodChild) {
      parentsWithPods.add(parentId);
      children.forEach(childId => {
        allChildrenToAlign.add(childId);
      });
    }
  });

  // Step 4: Find the deepest x-position among pods
  let deepestPodX = 0;
  layoutedNodes.forEach(node => {
    if (node.id.startsWith('pod:')) {
      if (node.position.x > deepestPodX) {
        deepestPodX = node.position.x;
      }
    }
  });

  // Step 5: Group aligned children by parent and adjust positions
  const childToParent = new Map<string, string>();
  edges.forEach(edge => {
    if (allChildrenToAlign.has(edge.target)) {
      childToParent.set(edge.target, edge.source);
    }
  });

  const parentToAlignedChildren = new Map<string, CustomNode[]>();
  layoutedNodes.forEach(node => {
    if (allChildrenToAlign.has(node.id)) {
      const parentId = childToParent.get(node.id);
      if (parentId) {
        if (!parentToAlignedChildren.has(parentId)) {
          parentToAlignedChildren.set(parentId, []);
        }
        parentToAlignedChildren.get(parentId)!.push(node);
      }
    }
  });

  // Step 6: Adjust pod positions to align vertically and center around parent
  parentToAlignedChildren.forEach((children, parentId) => {
    const parentNode = layoutedNodes.find(node => node.id === parentId);
    if (!parentNode || children.length === 0) return;

    // Sort children by their initial y-position to maintain order
    children.sort((a, b) => a.position.y - b.position.y);

    // Calculate total height of the children column
    const totalHeight = (children.length - 1) * CHILD_SPACING;

    // Center children around the parent
    const parentY = parentNode.position.y + NODE_HEIGHT / 2;
    const topY = parentY - totalHeight / 2;

    // Update positions of aligned children
    children.forEach((child, index) => {
      const newY = topY + index * CHILD_SPACING;
      const childIndex = layoutedNodes.findIndex(node => node.id === child.id);
      layoutedNodes[childIndex] = {
        ...child,
        position: {
          x: deepestPodX,
          y: newY,
        },
      };
    });
  });

  // Step 7: Build a comprehensive child-to-parent mapping for all relationships
  const allChildToParent = new Map<string, string>();
  edges.forEach(edge => {
    allChildToParent.set(edge.target, edge.source);
  });

  // Step 8: Build a reverse mapping from parent to all children (all types of relationships)
  const allParentToChildren = new Map<string, CustomNode[]>();
  layoutedNodes.forEach(node => {
    const parentId = allChildToParent.get(node.id);
    if (parentId) {
      if (!allParentToChildren.has(parentId)) {
        allParentToChildren.set(parentId, []);
      }
      allParentToChildren.get(parentId)!.push(node);
    }
  });

  // Step 9: Center all parent nodes with their children
  centerParentNodes(layoutedNodes, allParentToChildren, allChildToParent);

  // Step 10: Collision detection and adjustment
  applyCollisionDetection(layoutedNodes, NODE_WIDTH, NODE_HEIGHT);

  // Step 11: Adjust edges
  const adjustedEdges = edges.map(edge => {
    const targetNode = layoutedNodes.find(node => node.id === edge.target);
    if (targetNode && allChildrenToAlign.has(targetNode.id)) {
      return {
        ...edge,
        animated: true,
      };
    }
    return edge;
  });

  return { nodes: layoutedNodes, edges: adjustedEdges };
};

const centerParentNodes = (
  layoutedNodes: CustomNode[],
  allParentToChildren: Map<string, CustomNode[]>,
  allChildToParent: Map<string, string>
) => {
  const processedNodes = new Set<string>();

  // Helper function to adjust parent position based on its children
  const centerParentWithChildren = (parentId: string) => {
    if (processedNodes.has(parentId)) return;

    const children = allParentToChildren.get(parentId);
    if (!children || children.length === 0) return;

    // First ensure all children are processed
    children.forEach(child => {
      if (allParentToChildren.has(child.id)) {
        centerParentWithChildren(child.id);
      }
    });

    // Get updated positions of children after they might have been repositioned
    const updatedChildren = children.map(
      child => layoutedNodes.find(node => node.id === child.id)!
    );

    // Sort children by y position
    updatedChildren.sort((a, b) => a.position.y - b.position.y);

    // Find the middle child to align with
    const middleChildIndex = Math.floor(updatedChildren.length / 2);
    let targetY: number;

    if (updatedChildren.length % 2 === 1) {
      // Odd number of children: align with the middle child
      targetY = updatedChildren[middleChildIndex].position.y;
    } else {
      // Even number of children: align with the midpoint between the two middle children
      const midLower = updatedChildren[middleChildIndex - 1].position.y;
      const midUpper = updatedChildren[middleChildIndex].position.y;
      targetY = (midLower + midUpper) / 2;
    }

    // Adjust parent position
    const parentIndex = layoutedNodes.findIndex(node => node.id === parentId);
    if (parentIndex !== -1) {
      layoutedNodes[parentIndex] = {
        ...layoutedNodes[parentIndex],
        position: {
          x: layoutedNodes[parentIndex].position.x,
          y: targetY,
        },
      };
    }

    processedNodes.add(parentId);
  };

  // Start with nodes that don't have parents (roots)
  allParentToChildren.forEach((_, parentId) => {
    // Skip nodes that are someone else's children
    if (!allChildToParent.has(parentId)) {
      centerParentWithChildren(parentId);
    }
  });

  // Process all remaining parent nodes
  allParentToChildren.forEach((_, parentId) => {
    if (!processedNodes.has(parentId)) {
      centerParentWithChildren(parentId);
    }
  });
};

const applyCollisionDetection = (
  layoutedNodes: CustomNode[],
  NODE_WIDTH: number,
  NODE_HEIGHT: number
) => {
  layoutedNodes.sort((a, b) => a.position.y - b.position.y);

  for (let i = 1; i < layoutedNodes.length; i++) {
    const currentNode = layoutedNodes[i];
    const prevNode = layoutedNodes[i - 1];

    if (Math.abs(currentNode.position.x - prevNode.position.x) < NODE_WIDTH / 2) {
      const minSpacing = NODE_HEIGHT + 10;
      if (currentNode.position.y - prevNode.position.y < minSpacing) {
        layoutedNodes[i] = {
          ...currentNode,
          position: {
            ...currentNode.position,
            y: prevNode.position.y + minSpacing,
          },
        };
      }
    }
  }
};
