import { ipcMain, dialog, screen, shell, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import screenshot from 'screenshot-desktop';
import { Jimp } from 'jimp';
import { displayHelper } from '../helpers/display-helper';
import { createCaptureWindow } from '../helpers/create-capture-window';
import { createImageCaptureWindow } from '../helpers/create-image-capture-window';
import { createColorWindow } from '../helpers/create-color-window';
import { vision } from '../services/vision';
import { recorder } from '../services/recorder';
import { player } from '../services/player';

export function setupIpcHandlers(mainWindow: BrowserWindow | null, settings: any, saveSettings: (s: any) => void) {
    // 설정 관련
    ipcMain.handle('settings:get', () => settings);
    ipcMain.handle('settings:save', (_, newSettings) => {
        saveSettings(newSettings);
        return newSettings;
    });

    // 프로젝트 저장/로드
    ipcMain.handle('project:save', async (_, actions) => {
        const { filePath } = await dialog.showSaveDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] });
        if (filePath) fs.writeFileSync(filePath, JSON.stringify(actions, null, 2));
    });

    ipcMain.handle('project:load', async () => {
        const { filePaths } = await dialog.showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] });
        if (filePaths && filePaths.length > 0) return JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
        return null;
    });

    // 녹화 및 재생
    ipcMain.on('recorder:start', () => {
        if (settings.autoHide && mainWindow) mainWindow.minimize();
        recorder.start((block) => mainWindow?.webContents.send('recorder:on-action', block));
    });

    ipcMain.handle('recorder:stop', async () => {
        const blocks = recorder.stop();
        if (settings.autoHide && mainWindow) mainWindow.restore();
        return blocks;
    });

    ipcMain.handle('recorder:play', async (_, blocks) => {
        // ✅ 즉시 로딩 상태 전송 (사용자 피드백)
        if (mainWindow) {
            mainWindow.webContents.send('player:loading', true);
        }

        if (settings.autoHide && mainWindow) mainWindow.minimize();

        try {
            await player.play(blocks, (id, status, error) =>
                mainWindow?.webContents.send('player:progress', { id, status, error })
            );
        } finally {
            if (mainWindow) {
                mainWindow.webContents.send('player:loading', false);
                mainWindow.restore();
                mainWindow.webContents.send('player:done');
            }
        }
    });

    ipcMain.on('player:stop', () => {
        player.stop();
        if (mainWindow) {
            mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('player:done');
        }
    });
}

// 윈도우 숨김 제어 헬퍼는 background.ts에 두거나 별도 유틸로 분리 가능
