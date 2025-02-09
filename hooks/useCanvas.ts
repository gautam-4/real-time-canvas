'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import _ from 'lodash';
import type { DrawEvent, Point, Dimensions } from '@/types';

export function useCanvas() {
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

    return {
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
        clearCanvas,
        dimensions
    };
}
