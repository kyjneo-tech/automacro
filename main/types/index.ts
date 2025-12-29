import { Key } from '@nut-tree-fork/nut-js';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ActionBlock {
    id: string;
    type: 'click' | 'dblclick' | 'drag' | 'scroll' | 'type' | 'shortcut' | 'delay' | 'repeat-click' | 'key-repeat' | 'condition-image';
    payload: any;
    description: string;
    children?: ActionBlock[];
    elseChildren?: ActionBlock[];
}

export interface Settings {
    autoHide: boolean;
    panicKey: string;
    recordStartKey: string;
    recordStopKey: string;
}

export interface DisplayInfo {
    id: number;
    bounds: Rect;
    scaleFactor: number;
    isPrimary: boolean;
}
