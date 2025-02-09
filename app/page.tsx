'use client';

import { Toolbar } from '@/components/Toolbar';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Canvas } from '@/components/Canvas';
import { useCanvas } from '@/hooks/useCanvas';

export default function Home() {
  const {
    canvasRef,
    selectedTool,
    setSelectedTool,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    isLoadingState,
    connectionStatus,
    isLoaded,
    handlePointerEvent,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    clearCanvas
  } = useCanvas();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen">
      <LoadingOverlay isLoading={isLoadingState} />
      <ConnectionStatus status={connectionStatus} />

      <Toolbar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        clearCanvas={clearCanvas}
      />

      <Canvas
        canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
        handlePointerEvent={handlePointerEvent}
        handleDrawStart={handleDrawStart}
        handleDrawMove={handleDrawMove}
        handleDrawEnd={handleDrawEnd}
      />
    </div>
  );
}