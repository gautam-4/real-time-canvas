'use client';

import { Brush, Eraser, Trash, Sliders, Palette } from 'lucide-react';

interface ToolbarProps {
    selectedTool: 'brush' | 'eraser';
    setSelectedTool: (tool: 'brush' | 'eraser') => void;
    brushSize: number;
    setBrushSize: (size: number) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    clearCanvas: () => void;
}

export function Toolbar({
    selectedTool,
    setSelectedTool,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    clearCanvas
}: ToolbarProps) {
    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-100 bg-opacity-90 shadow-lg rounded-full flex items-center gap-4 px-6 py-2 z-10">
            <button
                className={`p-2 ${selectedTool === 'brush' ? 'bg-black text-white' : 'text-gray-800 hover:text-black'} rounded-full transition-colors`}
                onClick={() => setSelectedTool('brush')}
                aria-label="Brush Tool"
            >
                <Brush size={24} />
            </button>

            <button
                className={`p-2 ${selectedTool === 'eraser' ? 'bg-black text-white' : 'text-gray-800 hover:text-black'} rounded-full transition-colors`}
                onClick={() => setSelectedTool('eraser')}
                aria-label="Eraser Tool"
            >
                <Eraser size={24} />
            </button>

            <button
                className="p-2 text-gray-800 hover:text-black rounded-full transition-colors"
                onClick={clearCanvas}
                aria-label="Clear Canvas"
            >
                <Trash size={24} />
            </button>

            <label className="flex items-center gap-2">
                <Sliders size={24} />
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20"
                />
            </label>

            <label className="flex items-center gap-2">
                <Palette size={24} />
                <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-8 h-8 border-none outline-none"
                />
            </label>
        </div>
    );
}
