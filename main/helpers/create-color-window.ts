import { BrowserWindow, screen } from 'electron';
import path from 'path';

export const createColorWindow = () => {
  const displays = screen.getAllDisplays();

  // 듀얼/멀티 모니터 지원: 모든 디스플레이를 포함하는 전체 영역 계산
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  displays.forEach(display => {
    const { x, y, width, height } = display.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  console.log('\n========== Color Picker 창 생성 ==========');
  console.log(`총 ${displays.length}개의 디스플레이를 커버`);
  console.log(`창 위치: (${minX}, ${minY})`);
  console.log(`창 크기: ${totalWidth}x${totalHeight}`);
  console.log(`디스플레이 범위: X[${minX}, ${maxX}], Y[${minY}, ${maxY}]`);
  console.log('==========================================\n');

  const win = new BrowserWindow({
    x: minX,
    y: minY,
    width: totalWidth,
    height: totalHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  // 🔥 중요: 투명 창에서도 마우스 이벤트 받기!
  win.setIgnoreMouseEvents(false);

  // macOS에서 완전한 최상위 설정
  win.setAlwaysOnTop(true, 'pop-up-menu'); // screen-saver보다 높은 레벨
  win.setVisibleOnAllWorkspaces(true); // 모든 워크스페이스에서 보이기
  win.setFullScreenable(false); // 풀스크린 방지

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    win.loadURL('app://./color-picker'); // color-picker.html
  } else {
    const port = process.argv[2];
    win.loadURL(`http://localhost:${port}/color-picker`);
  }

  // 🔥 창이 준비되면 포커스 주고 마우스 이벤트 확실히 받기
  win.webContents.on('did-finish-load', () => {
    win.show();
    win.focus();
    win.setIgnoreMouseEvents(false);
    console.log('[Color Picker] 창 로드 완료, 포커스 설정됨');
  });

  return win;
};
