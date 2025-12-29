import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent, UiohookWheelEvent } from 'uiohook-napi';
import { mapKey, isModifierKey } from '../helpers/key-mapper';
import { clipboard } from 'electron';

export interface ActionBlock {
  id: string;
  type: 'click' | 'dblclick' | 'drag' | 'scroll' | 'type' | 'shortcut' | 'delay';
  payload: any;
  description: string;
}

class RecorderService {
  private isRecording = false;
  private recordedBlocks: ActionBlock[] = [];
  private lastActionTime: number = 0;
  private onActionCallback: ((block: ActionBlock) => void) | null = null;

  // Mouse States
  private pendingMouseDown: { x: number, y: number, time: number, button: number } | null = null;
  private lastClick: { x: number, y: number, time: number } | null = null;

  // Keyboard States
  private activeModifiers: Set<number> = new Set();
  private typingBuffer: string = "";
  private lastClipboard: string = "";

  // Scroll States
  private scrollBuffer: number = 0;
  private scrollTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMouseListeners();
    this.setupKeyboardListeners();
    this.setupWheelListener();
  }

  start(onAction: (block: ActionBlock) => void) {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recordedBlocks = [];
    this.lastActionTime = Date.now();
    this.onActionCallback = onAction;
    this.lastClipboard = clipboard.readText(); // 현재 클립보드 저장
    this.resetStates();
    uIOhook.start();
  }

  stop() {
    if (!this.isRecording) return [];
    
    // 남아있는 타이핑 버퍼 저장
    this.flushTypingBuffer();
    
    this.isRecording = false;
    uIOhook.stop();
    this.resetStates();
    return this.recordedBlocks;
  }
  
  private resetStates() {
      this.pendingMouseDown = null;
      this.lastClick = null;
      this.activeModifiers.clear();
      this.typingBuffer = "";
      this.scrollBuffer = 0;
      if(this.scrollTimer) clearTimeout(this.scrollTimer);
  }

  private setupMouseListeners() {
    uIOhook.on('mousedown', (e: UiohookMouseEvent) => {
      if (!this.isRecording) return;
      this.flushTypingBuffer(); // 클릭하면 타이핑 끝난 것
      this.pendingMouseDown = { x: e.x, y: e.y, time: Date.now(), button: e.button };
    });

    uIOhook.on('mouseup', (e: UiohookMouseEvent) => {
      if (!this.isRecording || !this.pendingMouseDown) return;
      this.processMouseAction(this.pendingMouseDown, { x: e.x, y: e.y, time: Date.now() }, e.button);
      this.pendingMouseDown = null;
    });
  }

  private setupKeyboardListeners() {
      uIOhook.on('keydown', (e: UiohookKeyboardEvent) => {
          if (!this.isRecording) return;

          // 1. Modifier Keys (Ctrl, Alt, Shift, Meta)
          if (isModifierKey(e.keycode)) {
              this.activeModifiers.add(e.keycode);
              // 수정자 키를 누르면 진행 중이던 타이핑은 완료된 것으로 간주
              this.flushTypingBuffer();
              return;
          }

          const nutKey = mapKey(e.keycode);
          const modifiers = Array.from(this.activeModifiers).map(k => mapKey(k)).filter(k => k !== null);

          // 2. Short-cut (Modifier + Key)
          if (modifiers.length > 0) {
              this.flushTypingBuffer();

              // Ctrl+V 감지 시 클립보드에서 실제 텍스트 가져오기 (한글 대응)
              if (nutKey === 'V' && (modifiers.includes('Control') || modifiers.includes('Meta'))) {
                  setTimeout(() => {
                      const pastedText = clipboard.readText();
                      if (pastedText && pastedText !== this.lastClipboard) {
                          this.addBlock({
                              id: `type-${Date.now()}`,
                              type: 'type',
                              payload: { text: pastedText },
                              description: `붙여넣기 "${pastedText.slice(0, 20)}${pastedText.length > 20 ? '...' : ''}"`
                          });
                          this.lastClipboard = pastedText;
                      }
                  }, 100); // 실제 붙여넣기 후 읽기
                  return;
              }

              if (nutKey) {
                  this.addBlock({
                      id: `shortcut-${Date.now()}`,
                      type: 'shortcut',
                      payload: { keys: [...modifiers, nutKey] },
                      description: `Shortcut: [${modifiers.join('+')}] + ${nutKey}`
                  });
              }
              return;
          }

          // 3. Special Keys (Enter, Tab, Escape, etc.)
          const isSpecialKey = [13, 9, 27, 8, 3650, 3658, 3666, 3667].includes(e.keycode); // Enter, Tab, Esc, Backspace, Arrow keys...
          if (isSpecialKey) {
              this.flushTypingBuffer();
              if (nutKey) {
                  this.addBlock({
                      id: `key-${Date.now()}`,
                      type: 'shortcut',
                      payload: { keys: [nutKey] },
                      description: `Press ${nutKey}`
                  });
              }
              return;
          }

          // 4. 일반 문자 입력 (Typing Buffer)
          // 간단한 키코드-문자 매핑 (Layout에 따라 다를 수 있음)
          // 실제로는 영문 기준으로 처리
          const char = this.keycodeToChar(e.keycode, this.activeModifiers.has(42) || this.activeModifiers.has(54));
          if (char) {
              this.typingBuffer += char;
          } else if (nutKey) {
              // 매핑되지 않은 일반 키는 즉시 블록화
              this.flushTypingBuffer();
              this.addBlock({
                  id: `key-${Date.now()}`,
                  type: 'shortcut',
                  payload: { keys: [nutKey] },
                  description: `Key: ${nutKey}`
              });
          }
      });

      uIOhook.on('keyup', (e: UiohookKeyboardEvent) => {
          if (!this.isRecording) return;
          if (isModifierKey(e.keycode)) {
              this.activeModifiers.delete(e.keycode);
          }
      });
  }

  // 기초적인 키코드 -> 문자 변환 (영문 기준)
  private keycodeToChar(keycode: number, isShift: boolean): string | null {
      // a-z
      if (keycode >= 30 && keycode <= 38) { // a-s... 이 부분은 uiohook-napi 상수가 더 안전함
         // 간단하게 매핑 (실제로는 더 많은 정의가 필요함)
      }
      
      // 우선 안전을 위해 nutKey 매핑을 활용하되, typingBuffer 보다는 개별 키 저장이 현재는 더 정확할 수 있음
      // 하지만 사용자 요청대로 '제대로' 작동하게 하기 위해, 간단한 알파벳이라도 버퍼링 시도
      const keyMap: Record<number, string> = {
          30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g', 35: 'h', 23: 'i', 36: 'j',
          37: 'k', 38: 'l', 50: 'm', 49: 'n', 24: 'o', 25: 'p', 16: 'q', 19: 'r', 31: 's', 20: 't',
          22: 'u', 47: 'v', 17: 'w', 45: 'x', 21: 'y', 44: 'z',
          2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
          57: ' '
      };
      
      let char = keyMap[keycode];
      if (char && isShift) {
          char = char.toUpperCase();
          // 숫자 키의 shift 대응은 생략 (Layout 의존성)
      }
      return char || null;
  }

  private setupWheelListener() {
      uIOhook.on('wheel', (e: UiohookWheelEvent) => {
          if (!this.isRecording) return;
          
          // 스크롤은 이벤트가 엄청 많이 발생하므로 모아서 처리 (Debounce)
          this.scrollBuffer += e.rotation;

          if (this.scrollTimer) clearTimeout(this.scrollTimer);
          this.scrollTimer = setTimeout(() => {
              if (this.scrollBuffer !== 0) {
                  this.addBlock({
                      id: `scroll-${Date.now()}`,
                      type: 'scroll',
                      payload: { amount: this.scrollBuffer * 100 }, // 감도 조절
                      description: `Scroll ${this.scrollBuffer > 0 ? 'Down' : 'Up'}`
                  });
                  this.scrollBuffer = 0;
              }
          }, 500);
      });
  }

  private flushTypingBuffer() {
      if (this.typingBuffer.length > 0) {
          this.addBlock({
              id: `type-${Date.now()}`,
              type: 'type',
              payload: { text: this.typingBuffer },
              description: `Type "${this.typingBuffer}"`
          });
          this.typingBuffer = "";
      }
  }

  private processMouseAction(start: any, end: any, button: number) {
    const now = Date.now();
    
    // 1. 대기 블록
    const delay = start.time - this.lastActionTime;
    if (delay > 200) {
        this.addBlock({
            id: `delay-${now}`,
            type: 'delay',
            payload: { ms: delay },
            description: `Wait ${delay}ms`
        });
    }

    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    // 2. 드래그 판단
    if (distance > 10 && button === 1) { // 왼쪽 드래그만 인정
        this.addBlock({
            id: `drag-${now}`,
            type: 'drag',
            payload: { startX: start.x, startY: start.y, endX: end.x, endY: end.y },
            description: `Drag (${start.x},${start.y}) -> (${end.x},${end.y})`
        });
    } else {
        // 3. 더블클릭 판단 (이전 클릭과 500ms 이내, 거리 5px 이내)
        const isDouble = this.lastClick && 
                         (now - this.lastClick.time < 500) &&
                         (Math.abs(end.x - this.lastClick.x) < 5) &&
                         (Math.abs(end.y - this.lastClick.y) < 5) &&
                         button === 1;

        if (isDouble) {
            // 이전 'click' 블록을 제거하고 'dblclick'으로 교체해야 함
            // 하지만 간단히 하기 위해: 더블클릭 블록을 추가하되, Player에서 처리하게 함
            this.recordedBlocks.pop(); // 방금 추가된 click 제거 (UI에서 깜빡일 수 있음)
            this.addBlock({
                id: `dblclick-${now}`,
                type: 'dblclick',
                payload: { x: end.x, y: end.y },
                description: `Double Click`
            });
            this.lastClick = null; // 초기화
        } else {
            const btnName = button === 2 ? 'Right' : button === 3 ? 'Middle' : 'Left';
            this.addBlock({
                id: `click-${now}`,
                type: 'click',
                payload: { x: end.x, y: end.y, button: button === 2 ? 'right' : button === 3 ? 'middle' : 'left' },
                description: `${btnName} Click`
            });
            this.lastClick = { x: end.x, y: end.y, time: now };
        }
    }
    
    this.lastActionTime = now;
  }

  private addBlock(block: ActionBlock) {
      this.recordedBlocks.push(block);
      if (this.onActionCallback) {
          this.onActionCallback(block);
      }
  }
}

export const recorder = new RecorderService();
