import path from 'path'
import { app, BrowserWindow, globalShortcut, dialog, shell, systemPreferences, ipcMain } from 'electron'
import serve from 'electron-serve'
import Store from 'electron-store'
import { createWindow } from './helpers'
import { player } from './services/player'
import { setupIpcHandlers } from './ipc'
import { setupPickingHandlers } from './ipc/picking'
import { diagnosticService } from './services/diagnostics'
import { fileUtils } from './helpers/file-utils'
import { visionEngine } from './services/vision-v2'

const isProd = process.env.NODE_ENV === 'production'
let mainWindow: BrowserWindow | null = null;

const store = new Store({
    defaults: { autoHide: true, panicKey: 'F12', recordStartKey: 'F9', recordStopKey: 'F10' }
});

let settings = {
    autoHide: store.get('autoHide') as boolean,
    panicKey: store.get('panicKey') as string,
    recordStartKey: store.get('recordStartKey') as string,
    recordStopKey: store.get('recordStopKey') as string
};

if (isProd) serve({ directory: 'app' })
else app.setPath('userData', `${app.getPath('userData')} (development)`)

function registerHotkeys() {
    globalShortcut.unregisterAll();
    if (settings.panicKey) {
        globalShortcut.register(settings.panicKey, () => {
            player.stop();
            if (mainWindow) {
                mainWindow.restore();
                mainWindow.webContents.send('player:done');
            }
        });
    }
    if (settings.recordStartKey) {
        globalShortcut.register(settings.recordStartKey, () => {
            if (mainWindow) mainWindow.webContents.send('recorder:start-request');
        });
    }
    if (settings.recordStopKey) {
        globalShortcut.register(settings.recordStopKey, () => {
            if (mainWindow) mainWindow.webContents.send('recorder:stop-request');
        });
    }
}

async function checkPermissions() {
    if (process.platform !== 'darwin') return;

    const missingPermissions: Array<{ type: string; message: string; url: string }> = [];

    // 1. Accessibility 권한 체크
    if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        missingPermissions.push({
            type: 'Accessibility (접근성)',
            message: '마우스 및 키보드 제어를 위해 필요합니다.',
            url: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
        });
    }

    // 2. Screen Recording 권한 체크 (macOS 10.15+)
    try {
        const screenRecordingStatus = systemPreferences.getMediaAccessStatus('screen');
        if (screenRecordingStatus !== 'granted') {
            missingPermissions.push({
                type: 'Screen Recording (화면 기록)',
                message: '화면 캡처 및 이미지 인식을 위해 필요합니다.',
                url: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
            });
        }
    } catch (e) {
        // macOS 10.14 이하에서는 Screen Recording 권한이 없으므로 무시
        console.log('[Permissions] Screen Recording permission not available on this macOS version');
    }

    // 권한이 부족하면 대화상자 표시
    if (missingPermissions.length > 0) {
        const permissionList = missingPermissions.map(p => `• ${p.type}: ${p.message}`).join('\n');
        const { response } = await dialog.showMessageBox({
            type: 'warning',
            title: '권한 필요',
            message: 'My-Mate가 정상적으로 작동하기 위해 다음 권한이 필요합니다:',
            detail: permissionList + '\n\n권한을 부여하지 않으면 일부 기능이 작동하지 않을 수 있습니다.',
            buttons: ['시스템 환경설정 열기', '나중에'],
            defaultId: 0
        });

        if (response === 0) {
            // 첫 번째 누락된 권한의 설정 페이지 열기
            shell.openExternal(missingPermissions[0].url);
        }
    } else {
        console.log('[Permissions] ✅ All required permissions granted');
    }
}

async function withHiddenWindow<T>(work: () => Promise<T>): Promise<T | null> {
    const wasVisible = mainWindow && mainWindow.isVisible();
    try {
        if (mainWindow) { mainWindow.hide(); await new Promise(r => setTimeout(r, 300)); }
        return await work();
    } catch (e) { return null; }
    finally {
        if (mainWindow && wasVisible) {
            mainWindow.show();
            setTimeout(() => mainWindow?.focus(), 100);
        }
    }
}

;(async () => {
  await app.whenReady()
  await checkPermissions();

  // ✅ Vision Engine 초기화 (앱 시작 시 미리 준비)
  console.log('[Startup] Initializing Vision Engine...');
  visionEngine.initialize();
  console.log('[Startup] Vision Engine ready!');

  // 오래된 타겟 이미지 정리 (7일 이상)
  const targetsDir = isProd ? path.join(process.resourcesPath, 'targets') : path.join(__dirname, '..', 'targets');
  fileUtils.cleanOldTargets(targetsDir);

  mainWindow = createWindow('main', {
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  })

  if (isProd) await mainWindow.loadURL('app://./home')
  else await mainWindow.loadURL(`http://localhost:${process.argv[2]}/home`)

  // --- 핸들러 설정 ---
  setupIpcHandlers(mainWindow, settings, (newS) => {
      settings = { ...settings, ...newS };
      store.set(settings);
      registerHotkeys();
  });
  setupPickingHandlers(withHiddenWindow);

  // 자가 진단 핸들러
  ipcMain.handle('app:diagnose', () => diagnosticService.runAllChecks());

  registerHotkeys();
})()

app.on('window-all-closed', () => app.quit())