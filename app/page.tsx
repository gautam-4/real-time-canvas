'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Brush, Eraser, Trash, Sliders, Palette } from 'lucide-react'; // Importing necessary icons

// Define styled components
const CanvasContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: white;
  background-image: linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px);
  background-size: 20px 20px;
  background-repeat: repeat;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 20px;
  background-color: #f4f4f4;
  border-bottom: 2px solid #ddd;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Button = styled.button`
  padding: 8px;
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  &:hover {
    opacity: 0.8;
  }
`;

const Slider = styled.input`
  width: 100px;
`;

const ColorInput = styled.input`
  type: color;
  padding: 5px;
  font-size: 18px;
`;

// Rename the styled canvas component to StyledCanvas
const StyledCanvas = styled.canvas`
  border: 1px solid #ccc;
  cursor: crosshair;
  flex-grow: 1;
`;

// Main Home component
export default function Home() {
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000'); // Default color is black
  const [isDrawing, setIsDrawing] = useState(false);
  let ctx: CanvasRenderingContext2D | null = null;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isErasing ? 'white' : brushColor; // Set the brush color
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx || !isDrawing) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <CanvasContainer>
      <Header>
        <Logo>
          <Brush size={24} /> Brush App
        </Logo>
        <Toolbar>
          <Button onClick={() => setIsErasing(false)}>
            <Brush size={24} />
          </Button>
          <Button onClick={() => setIsErasing(true)}>
            <Eraser size={24} />
          </Button>
          <Button
            onClick={() => {
              const canvas = document.querySelector('canvas');
              if (canvas) clearCanvas(canvas);
            }}
          >
            <Trash size={24} />
          </Button>
          <label>
            <Sliders size={24} />
            <Slider
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>
          <label>
            <Palette size={24} />
            <ColorInput
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)} // Update brush color
            />
          </label>
        </Toolbar>
      </Header>
      <StyledCanvas
        width={window.innerWidth}
        height={window.innerHeight - 50}
        ref={(canvas) => {
          if (canvas && !ctx) {
            ctx = canvas.getContext('2d');
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </CanvasContainer>
  );
}

