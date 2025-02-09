export interface Point {
    x: number;
    y: number;
}

export interface Dimensions {
    width: number;
    height: number;
}

export interface DrawEvent {
    event_type: 'draw' | 'clear';
    properties: {
        type: 'brush' | 'eraser';
        color: string;
        size: number;
        points: Point[];
        isNewStroke?: boolean;
    };
}