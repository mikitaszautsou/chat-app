import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import TreeNode from './TreeNode';
import useTreeLayout from '../hooks/useTreeLayout';

const ConversationTreeInner = ({
  messagesMap,
  rootMessageIds,
  currentBranchPath,
  onNodeClick,
}) => {
  const { nodes, edges } = useTreeLayout(messagesMap, rootMessageIds, currentBranchPath);

  // Define custom node types
  const nodeTypes = useMemo(() => ({ treeNode: TreeNode }), []);

  // Handle node click
  const handleNodeClick = useCallback(
    (event, node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Empty state
  if (!nodes || nodes.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No conversation yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.isCurrentNode) return '#1976d2';
            if (node.data.isInCurrentBranch) return '#90caf9';
            return '#e0e0e0';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{
            backgroundColor: '#f5f5f5',
          }}
        />
      </ReactFlow>

      {/* Custom zoom controls overlay (optional - react-flow already has controls) */}
      <ZoomControls />
    </Box>
  );
};

// Custom zoom controls component
const ZoomControls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        p: 0.5,
        zIndex: 5,
        backgroundColor: 'background.paper',
      }}
    >
      <IconButton
        size="small"
        onClick={() => zoomIn({ duration: 200 })}
        title="Zoom In"
      >
        <ZoomInIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => zoomOut({ duration: 200 })}
        title="Zoom Out"
      >
        <ZoomOutIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => fitView({ duration: 200, padding: 0.2 })}
        title="Fit View"
      >
        <FitScreenIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

// Wrapper component with ReactFlowProvider
const ConversationTree = (props) => (
  <ReactFlowProvider>
    <ConversationTreeInner {...props} />
  </ReactFlowProvider>
);

export default ConversationTree;
