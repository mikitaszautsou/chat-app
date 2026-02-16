/**
 * Tree utility functions for conversation tree visualization
 */

/**
 * Extract a preview of message content (plain text only)
 * @param {string|Array} content - Message content (string or array of content blocks)
 * @param {number} maxLength - Maximum length of preview
 * @returns {string} Preview text
 */
export const getMessagePreview = (content, maxLength = 30) => {
  if (!content) return '';

  // Handle array content (content blocks)
  let textContent = '';
  if (Array.isArray(content)) {
    textContent = content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join(' ');
  } else if (typeof content === 'string') {
    textContent = content;
  } else {
    return '';
  }

  // Strip markdown and get plain text
  const plainText = textContent
    .replace(/```[\s\S]*?```/g, '[code]') // Replace code blocks
    .replace(/`[^`]+`/g, '[code]') // Replace inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
};

/**
 * Find the path from root to a specific node
 * @param {string} nodeId - Target node ID
 * @param {Object} messagesMap - Map of all messages
 * @returns {string[]} Array of message IDs from root to node
 */
export const findPathToNode = (nodeId, messagesMap) => {
  const path = [];
  let currentId = nodeId;

  while (currentId) {
    path.unshift(currentId);
    const message = messagesMap[currentId];
    currentId = message?.parentId;
  }

  return path;
};

/**
 * Build react-flow nodes from messages map
 * @param {Object} messagesMap - Map of all messages
 * @param {string[]} rootIds - Array of root message IDs
 * @param {string[]} currentBranchPath - Current branch path
 * @returns {Array} Array of react-flow node objects
 */
export const buildTreeNodes = (messagesMap, rootIds, currentBranchPath) => {
  const nodes = [];
  const visited = new Set();

  const traverse = (messageId, level = 0) => {
    if (!messageId || visited.has(messageId)) return;
    visited.add(messageId);

    const message = messagesMap[messageId];
    if (!message) return;

    const isInCurrentBranch = currentBranchPath.includes(messageId);
    const isCurrentNode = currentBranchPath[currentBranchPath.length - 1] === messageId;
    const childrenIds = message.children || [];
    const hasBranches = childrenIds.length > 1;

    nodes.push({
      id: messageId,
      type: 'treeNode',
      data: {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        isInCurrentBranch,
        isCurrentNode,
        hasBranches,
        childCount: childrenIds.length,
      },
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
    });

    // Traverse children
    childrenIds.forEach(childId => traverse(childId, level + 1));
  };

  // Start from root messages
  rootIds.forEach(rootId => traverse(rootId));

  return nodes;
};

/**
 * Build react-flow edges from messages map
 * @param {Object} messagesMap - Map of all messages
 * @returns {Array} Array of react-flow edge objects
 */
export const buildTreeEdges = (messagesMap) => {
  const edges = [];

  Object.entries(messagesMap).forEach(([messageId, message]) => {
    if (message.parentId) {
      edges.push({
        id: `${message.parentId}-${messageId}`,
        source: message.parentId,
        target: messageId,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#999',
          strokeWidth: 2,
        },
      });
    }
  });

  return edges;
};

/**
 * Calculate if a message has any descendants
 * @param {string} messageId - Message ID to check
 * @param {Object} messagesMap - Map of all messages
 * @returns {boolean} True if message has descendants
 */
export const hasDescendants = (messageId, messagesMap) => {
  const message = messagesMap[messageId];
  if (!message || !message.children || message.children.length === 0) {
    return false;
  }
  return true;
};
