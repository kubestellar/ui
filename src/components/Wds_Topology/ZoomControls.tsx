import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { useReactFlow } from "reactflow";

interface ZoomControlsProps {
  theme: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const ZoomControls = memo<ZoomControlsProps>(({ theme, onToggleCollapse, isCollapsed, onExpandAll, onCollapseAll }) => {
  const { getZoom, setViewport } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const animatingRef = useRef(false);
  const initializedRef = useRef(false);

  const zoomRatioRef = useRef<number | null>(null);

  const snapToStep = useCallback((zoom: number) => {
    const step = 10;
    return Math.round(zoom / step) * step;
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      const timer = setTimeout(() => {
     
        const initialZoom = getZoom();
   
        zoomRatioRef.current = initialZoom / 1.0; 
        initializedRef.current = true;
        
        setZoomLevel(100);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [getZoom]);

  // Update zoom level whenever component mounts and when zoom changes
  useEffect(() => {
    // Only update after initialization and not during animations
    if (initializedRef.current && !animatingRef.current && zoomRatioRef.current) {
      const actualZoom = getZoom();
      // Normalize the zoom level for display
      const normalizedZoom = (actualZoom / zoomRatioRef.current) * 100;
      const snappedZoom = snapToStep(normalizedZoom);
      setZoomLevel(Math.min(Math.max(snappedZoom, 10), 200));
    }
    
    // Periodic sync
    const intervalId = setInterval(() => {
      if (initializedRef.current && !animatingRef.current && zoomRatioRef.current) {
        const actualZoom = getZoom();
        const normalizedZoom = (actualZoom / zoomRatioRef.current) * 100;
        const snappedZoom = snapToStep(normalizedZoom);
        setZoomLevel(Math.min(Math.max(snappedZoom, 10), 200));
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [getZoom, snapToStep]);

  const animateZoom = useCallback((targetNormalizedZoom: number, duration: number = 200) => {
    if (!zoomRatioRef.current) return;
    
    const startZoom = getZoom();
    // Convert normalized target zoom back to actual zoom
    const targetActualZoom = (targetNormalizedZoom / 100) * zoomRatioRef.current;
    
    const startTime = performance.now();
    animatingRef.current = true;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newZoom = startZoom + (targetActualZoom - startZoom) * progress;
      
      setViewport({ zoom: newZoom, x: 0, y: 0 });
      
      if (zoomRatioRef.current) {
        const normalizedZoom = (newZoom / zoomRatioRef.current) * 100;
        setZoomLevel(snapToStep(normalizedZoom));
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        animatingRef.current = false;
      }
    };

    requestAnimationFrame(step);
  }, [getZoom, setViewport, snapToStep]);

  const handleResetZoom = useCallback(() => {
    if (!zoomRatioRef.current) return;
    
    const targetActualZoom = 1.0 * zoomRatioRef.current;
    
    animatingRef.current = true;
    setViewport({ zoom: targetActualZoom, x: 0, y: 0 });
    setZoomLevel(100);
    
    setTimeout(() => {
      animatingRef.current = false;
    }, 50);
  }, [setViewport]);

  const handleZoomIn = useCallback(() => {
    if (!zoomRatioRef.current) return;
    
    const currentActualZoom = getZoom();
    const currentNormalizedZoom = (currentActualZoom / zoomRatioRef.current) * 100;
    const newNormalizedZoom = Math.min(currentNormalizedZoom + 10, 200);
    
    animateZoom(newNormalizedZoom);
  }, [animateZoom, getZoom]);

  const handleZoomOut = useCallback(() => {
    if (!zoomRatioRef.current) return;
    
    const currentActualZoom = getZoom();
    const currentNormalizedZoom = (currentActualZoom / zoomRatioRef.current) * 100;
    const newNormalizedZoom = Math.max(currentNormalizedZoom - 10, 10);
    
    animateZoom(newNormalizedZoom);
  }, [animateZoom, getZoom]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 20,
        left: 20,
        display: "flex",
        gap: 1,
        background: theme === "dark" ? "#333" : "#fff",
        padding: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      <Button
        variant="text"
        onClick={onToggleCollapse}
        title="Group By Resource/Kind"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          backgroundColor: isCollapsed ? (theme === "dark" ? "#555" : "#e3f2fd") : "transparent",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <i className="fa fa-object-group fa-fw" style={{ fontSize: "17px" }} />
      </Button>
      <Button
        variant="text"
        onClick={onExpandAll}
        title="Expand all the child nodes of all parent nodes"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <i className="fa fa-plus fa-fw" style={{ fontSize: "17px" }} />
      </Button>
      <Button
        variant="text"
        onClick={onCollapseAll}
        title="Collapse all the child nodes of all parent nodes"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <i className="fa fa-minus fa-fw" style={{ fontSize: "17px" }} />
      </Button>
      <Button
        variant="text"
        onClick={handleResetZoom}
        title="Reset Zoom to 100%"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <i className="fa fa-home fa-fw" style={{ fontSize: "17px" }} />
      </Button>
      <Button
        variant="text"
        onClick={handleZoomIn}
        title="Zoom In"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <ZoomIn />
      </Button>
      <Button
        variant="text"
        onClick={handleZoomOut}
        title="Zoom Out"
        sx={{
          color: theme === "dark" ? "#fff" : "#6d7f8b",
          "&:hover": {
            backgroundColor: theme === "dark" ? "#555" : "#e3f2fd",
          },
          minWidth: "36px",
          padding: "4px",
        }}
      >
        <ZoomOut />
      </Button>
      <Typography
        variant="body1"
        sx={{
          border: `2px solid ${theme === "dark" ? "#ccc" : "#1976d2"}`,
          backgroundColor: theme === "dark" ? "#444" : "#e3f2fd",
          color: theme === "dark" ? "#fff" : "#000",
          padding: "4px 8px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "50px",
        }}
      >
        {zoomLevel}%
      </Typography>
    </Box>
  );
});