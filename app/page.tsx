'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Brush, Eraser, Trash, Sliders, Palette } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import _ from 'lodash';

interface DrawEvent {
  event_type: 'draw' | 'clear';
  properties: {
    type: 'brush' | 'eraser';
    color: string;
    size: number;
    points: Point[];
    isNewStroke?: boolean;
  };
}

interface Point {
  x: number;
  y: number;
}

interface Dimensions {
  width: number;
  height: number;
}

export default function Home() {
  // Tool states
  const [selectedTool, setSelectedTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [brushColor, setBrushColor] = useState<string>('#000000');

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Canvas states
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Debounced event sender
  const debouncedSendEvent = useCallback(
    _.debounce(async (drawEvent: DrawEvent) => {
      try {
        const { error } = await supabase
          .from('canvas_events')
          .insert([drawEvent]);
        if (error) throw error;
      } catch (error) {
        console.error('Error saving draw event:', error);
      }
    }, 100),
    []
  );

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((event: DrawEvent) => {
    if (!ctxRef.current) return;

    const ctx = ctxRef.current;
    const dpr = window.devicePixelRatio || 1;

    if (event.event_type === 'clear') {
      ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
      return;
    }

    const { type, color, size, points } = event.properties;

    ctx.strokeStyle = type === 'eraser' ? 'white' : color;
    ctx.lineWidth = size;

    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.closePath();
  }, []);

  // Load canvas state
  const loadCanvasState = useCallback(async () => {
    setIsLoadingState(true);
    try {
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('canvas_events')
        .select('*')
        .order('sequence_number', { ascending: true })
        .filter('created_at', 'lte', timestamp);

      if (error) throw error;

      if (ctxRef.current && data) {
        // Clear canvas before loading state
        const dpr = window.devicePixelRatio || 1;
        ctxRef.current.clearRect(0, 0, ctxRef.current.canvas.width / dpr, ctxRef.current.canvas.height / dpr);

        // Apply events
        data.forEach((event: DrawEvent) => {
          handleRealtimeUpdate(event);
        });
      }
    } catch (error) {
      console.error('Error loading canvas state:', error);
    } finally {
      setIsLoadingState(false);
    }
  }, [handleRealtimeUpdate]);

  // Initialize dimensions on client side
  useEffect(() => {
    const updateDimensions = _.debounce(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, 250);

    updateDimensions();
    setIsLoaded(true);

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      updateDimensions.cancel();
    };
  }, []);

  // Initialize canvas and Supabase subscription
  useEffect(() => {
    if (!canvasRef.current || !isLoaded || dimensions.width === 0) return;

    // Set up canvas with DPR scaling
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
    }

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('canvas_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_events',
        },
        (payload) => handleRealtimeUpdate(payload.new as DrawEvent)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      });

    // Load existing canvas state
    loadCanvasState();

    return () => {
      subscription.unsubscribe();
      setIsDrawing(false);
      setCurrentStroke([]);
      setConnectionStatus('disconnected');
    };
  }, [dimensions, isLoaded, handleRealtimeUpdate, loadCanvasState]);

  // Handle loading state
  useEffect(() => {
    document.body.style.cursor = isLoadingState ? 'wait' : 'default';
  }, [isLoadingState]);

  const handleDrawStart = useCallback((point: Point) => {
    setIsDrawing(true);
    setCurrentStroke([point]);
  }, []);

  const handleDrawMove = useCallback(
    (point: Point) => {
      if (!isDrawing) return;

      setCurrentStroke(prev => [...prev, point]);

      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctx.strokeStyle = selectedTool === 'eraser' ? 'white' : brushColor;
        ctx.lineWidth = brushSize;

        if (currentStroke.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.closePath();
        }
      }
    },
    [isDrawing, selectedTool, brushColor, brushSize, currentStroke]
  );

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;
    setIsDrawing(false);

    const drawEvent: DrawEvent = {
      event_type: 'draw',
      properties: {
        type: selectedTool,
        color: brushColor,
        size: brushSize,
        points: currentStroke,
      },
    };

    debouncedSendEvent(drawEvent);
    setCurrentStroke([]);
  }, [isDrawing, selectedTool, brushColor, brushSize, currentStroke, debouncedSendEvent]);

  const handlePointerEvent = useCallback((
    e: React.PointerEvent<HTMLCanvasElement>,
    handler: (point: Point) => void
  ) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    handler(point);
  }, []);

  const clearCanvas = useCallback(async () => {
    const clearEvent: DrawEvent = {
      event_type: 'clear',
      properties: {
        type: 'brush',
        color: '',
        size: 0,
        points: [],
      },
    };

    try {
      const { error } = await supabase
        .from('canvas_events')
        .insert([clearEvent]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving clear event:', error);
    }
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="relative h-screen w-screen">
      {isLoadingState && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
          <div className="text-gray-800">Loading canvas...</div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="absolute top-4 right-4 bg-red-100 text-red-800 px-4 py-2 rounded-md z-30">
          Connection lost. Please refresh the page.
        </div>
      )}

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-100 bg-opacity-90 shadow-lg rounded-full flex items-center gap-4 px-6 py-2 z-10">
        <button
          className={`p-2 ${selectedTool === 'brush' ? 'bg-black text-white' : 'text-gray-800 hover:text-black'
            } rounded-full transition-colors`}
          onClick={() => setSelectedTool('brush')}
          aria-label="Brush Tool"
        >
          <Brush size={24} />
        </button>

        <button
          className={`p-2 ${selectedTool === 'eraser' ? 'bg-black text-white' : 'text-gray-800 hover:text-black'
            } rounded-full transition-colors`}
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

      {/* Canvas */}
      <canvas
        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-0 bg-white"
        ref={canvasRef}
        onPointerDown={(e) => handlePointerEvent(e, handleDrawStart)}
        onPointerMove={(e) => handlePointerEvent(e, handleDrawMove)}
        onPointerUp={() => handleDrawEnd()}
        onPointerLeave={() => handleDrawEnd()}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}