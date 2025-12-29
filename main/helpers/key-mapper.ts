import { UiohookKey } from 'uiohook-napi';
import { Key } from '@nut-tree-fork/nut-js';

// uIOhook keycode -> nut.js Key enum
export const mapKey = (uioCode: number): Key | null => {
    switch (uioCode) {
        // --- Letters ---
        case UiohookKey.A: return Key.A;
        case UiohookKey.B: return Key.B;
        case UiohookKey.C: return Key.C;
        case UiohookKey.D: return Key.D;
        case UiohookKey.E: return Key.E;
        case UiohookKey.F: return Key.F;
        case UiohookKey.G: return Key.G;
        case UiohookKey.H: return Key.H;
        case UiohookKey.I: return Key.I;
        case UiohookKey.J: return Key.J;
        case UiohookKey.K: return Key.K;
        case UiohookKey.L: return Key.L;
        case UiohookKey.M: return Key.M;
        case UiohookKey.N: return Key.N;
        case UiohookKey.O: return Key.O;
        case UiohookKey.P: return Key.P;
        case UiohookKey.Q: return Key.Q;
        case UiohookKey.R: return Key.R;
        case UiohookKey.S: return Key.S;
        case UiohookKey.T: return Key.T;
        case UiohookKey.U: return Key.U;
        case UiohookKey.V: return Key.V;
        case UiohookKey.W: return Key.W;
        case UiohookKey.X: return Key.X;
        case UiohookKey.Y: return Key.Y;
        case UiohookKey.Z: return Key.Z;

        // --- Numbers ---
        case UiohookKey['0']: return Key.Num0;
        case UiohookKey['1']: return Key.Num1;
        case UiohookKey['2']: return Key.Num2;
        case UiohookKey['3']: return Key.Num3;
        case UiohookKey['4']: return Key.Num4;
        case UiohookKey['5']: return Key.Num5;
        case UiohookKey['6']: return Key.Num6;
        case UiohookKey['7']: return Key.Num7;
        case UiohookKey['8']: return Key.Num8;
        case UiohookKey['9']: return Key.Num9;

        // --- Modifiers ---
        case UiohookKey.Ctrl: return Key.LeftControl;
        case UiohookKey.Alt: return Key.LeftAlt;
        case UiohookKey.Shift: return Key.LeftShift;
        case UiohookKey.Meta: return Key.LeftSuper; // Command/Windows key

        // --- Controls ---
        case UiohookKey.Enter: return Key.Enter;
        case UiohookKey.Space: return Key.Space;
        case UiohookKey.Tab: return Key.Tab;
        case UiohookKey.Backspace: return Key.Backspace;
        case UiohookKey.Escape: return Key.Escape;
        
        // --- Arrows ---
        case UiohookKey.ArrowUp: return Key.Up;
        case UiohookKey.ArrowDown: return Key.Down;
        case UiohookKey.ArrowLeft: return Key.Left;
        case UiohookKey.ArrowRight: return Key.Right;

        default: return null;
    }
}

export const isModifierKey = (uioCode: number): boolean => {
    return [
        UiohookKey.Ctrl, UiohookKey.Alt, UiohookKey.Shift, UiohookKey.Meta,
        UiohookKey.CtrlRight, UiohookKey.AltRight, UiohookKey.ShiftRight
    ].includes(uioCode);
}
