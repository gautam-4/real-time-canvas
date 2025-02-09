'use client';

import type { Point } from '../types';

interface CanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    handlePointerEvent: (e: React.PointerEvent<HTMLCanvasElement>, handler: (point: Point) => void) => void;
    handleDrawStart: (point: Point) => void;
    handleDrawMove: (point: Point) => void;
    handleDrawEnd: () => void;
}

export function Canvas({
    canvasRef,
    handlePointerEvent,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd
}: CanvasProps) {
    return (
        <canvas
            className="absolute top-0 left-0 w-full h-full cursor-crosshair z-0 bg-white"
            ref={canvasRef}
            onPointerDown={(e) => handlePointerEvent(e, handleDrawStart)}
            onPointerMove={(e) => handlePointerEvent(e, handleDrawMove)}
            onPointerUp={() => handleDrawEnd()}
            onPointerLeave={() => handleDrawEnd()}
            style={{ touchAction: 'none' }}
        />
    );
}