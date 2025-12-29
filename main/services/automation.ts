import { mouse, Point, straightTo, keyboard, Button, screen, Key } from "@nut-tree-fork/nut-js";

// 각 인스턴스에 지연 시간 설정
mouse.config.autoDelayMs = 50;
keyboard.config.autoDelayMs = 50;

export const automation = {
  // --- Mouse Actions ---
  async moveMouse(x: number, y: number) {
    try { 
        // nut-js는 기본적으로 논리 좌표(Logical)를 사용함
        await mouse.move(straightTo(new Point(x, y))); 
        return { success: true }; 
    } catch (error) { 
        console.error(`[Automation] Mouse move failed:`, error);
        return { success: false }; 
    }
  },

  async clickMouse(button: 'left' | 'right' | 'middle' | 'double' = 'left') {
    try {
        if (button === 'double') {
            await mouse.doubleClick(Button.LEFT);
        } else {
            const btn = button === 'right' ? Button.RIGHT : button === 'middle' ? Button.MIDDLE : Button.LEFT;
            await mouse.click(btn);
        }
        return { success: true };
    } catch { return { success: false }; }
  },

  // 마우스 연타
  async repeatClick(button: 'left' | 'right' = 'left', count: number = 10, intervalMs: number = 50) {
      try {
          const btn = button === 'right' ? Button.RIGHT : Button.LEFT;
          for (let i = 0; i < count; i++) {
              await mouse.click(btn);
              if (intervalMs > 0) await new Promise(r => setTimeout(r, intervalMs));
          }
          return { success: true };
      } catch { return { success: false }; }
  },

  async dragMouse(startX: number, startY: number, endX: number, endY: number) {
    try {
        await mouse.move(straightTo(new Point(startX, startY)));
        await mouse.pressButton(Button.LEFT);
        await mouse.move(straightTo(new Point(endX, endY)));
        await mouse.releaseButton(Button.LEFT);
        return { success: true };
    } catch { return { success: false }; }
  },

  async scrollMouse(amount: number) {
      try {
          if (amount > 0) await mouse.scrollDown(amount);
          else await mouse.scrollUp(Math.abs(amount));
          return { success: true };
      } catch { return { success: false }; }
  },

  // --- Keyboard Actions ---
  async typeText(text: string) {
    try {
        keyboard.config.autoDelayMs = 10;
        await keyboard.type(text);
        return { success: true };
    } catch { return { success: false }; }
  },

  // 키보드 단축키/특수키
  async pressShortcut(keys: Key[]) {
      try {
          await keyboard.pressKey(...keys);
          await keyboard.releaseKey(...keys);
          return { success: true };
      } catch { return { success: false }; }
  },

  // 키 연타
  async repeatKey(key: Key, count: number = 5, intervalMs: number = 50) {
      try {
          for (let i = 0; i < count; i++) {
              await keyboard.pressKey(key);
              await keyboard.releaseKey(key);
              if (intervalMs > 0) await new Promise(r => setTimeout(r, intervalMs));
          }
          return { success: true };
      } catch { return { success: false }; }
  },

  // 키 홀드 (누르고 있기)
  async holdKey(key: Key) {
      try { await keyboard.pressKey(key); return { success: true }; } catch { return { success: false }; }
  },

  async releaseKey(key: Key) {
    try { await keyboard.releaseKey(key); return { success: true }; } catch { return { success: false }; }
  }
};