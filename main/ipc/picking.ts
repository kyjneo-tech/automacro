import { ipcMain, BrowserWindow } from 'electron';
import { displayHelper } from '../helpers/display-helper';
import { createCaptureWindow } from '../helpers/create-capture-window';
import { createImageCaptureWindow } from '../helpers/create-image-capture-window';
import { createColorWindow } from '../helpers/create-color-window';
import { visionEngine } from '../services/vision-v2';
import screenshot from 'screenshot-desktop';
import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { shell } from 'electron';

export function setupPickingHandlers(withHiddenWindow: <T>(work: () => Promise<T>) => Promise<T | null>) {
    
    // 1. 포인트 좌표 선택
    ipcMain.handle('pick:point', async () => {
        return await withHiddenWindow(async () => {
            let subWin = createCaptureWindow();
            const winBounds = subWin.getBounds();

            return new Promise((resolve) => {
                let completed = false;

                const cleanup = () => {
                    if (completed) return;
                    completed = true;
                    ipcMain.removeListener('capture:complete', onComplete);
                    ipcMain.removeListener('capture:cancel', onCancel);
                    if (subWin && !subWin.isDestroyed()) subWin.close();
                };

                const onComplete = (_: any, rect: any) => {
                    const abs = { x: winBounds.x + rect.x, y: winBounds.y + rect.y };
                    cleanup();
                    resolve(abs);
                };

                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };

                ipcMain.once('capture:complete', onComplete);
                ipcMain.once('capture:cancel', onCancel);
                subWin.on('closed', onCancel);
            });
        });
    });

    // 2. 이미지 영역 캡처
    ipcMain.handle('pick:image', async () => {
        return await withHiddenWindow(async () => {
            let subWin = createImageCaptureWindow();
            const winBounds = subWin.getBounds();

            return new Promise((resolve) => {
                let completed = false;

                const cleanup = () => {
                    if (completed) return;
                    completed = true;
                    ipcMain.removeListener('capture:complete', onComplete);
                    ipcMain.removeListener('capture:cancel', onCancel);
                    if (subWin && !subWin.isDestroyed()) subWin.close();
                };

                const onComplete = async (_: any, rect: any) => {
                    const screenX = winBounds.x + rect.x;
                    const screenY = winBounds.y + rect.y;
                    const pixel = displayHelper.screenToPixel(screenX, screenY);

                    const imageWidth = Math.round(rect.width * pixel.scaleFactor);
                    const imageHeight = Math.round(rect.height * pixel.scaleFactor);

                    try {
                        const imgBuffer = await screenshot({ format: 'png' });
                        const image = await Jimp.read(imgBuffer);
                        let cropped = image.crop({ x: pixel.x, y: pixel.y, w: imageWidth, h: imageHeight });

                        if (pixel.scaleFactor > 1) {
                            cropped = cropped.resize({ w: rect.width, h: rect.height });
                        }

                        const isProd = process.env.NODE_ENV === 'production';
                        const projectRoot = isProd ? process.resourcesPath : path.join(__dirname, '..', '..');
                        const targetFileName = `target-${Date.now()}.png`;
                        const savePath = path.join(projectRoot, 'targets', targetFileName);

                        if (!fs.existsSync(path.dirname(savePath))) fs.mkdirSync(path.dirname(savePath), { recursive: true });
                        await cropped.write(savePath);
                        shell.openPath(savePath).catch(() => {});

                        cleanup();
                        // 이미지만 반환 (좌표 제거 - Vision 2.0에서 자동으로 전체 화면에서 찾음)
                        resolve({ path: `targets/${targetFileName}` });
                    } catch (e) {
                        console.error('[Pick:Image] Error:', e);
                        cleanup();
                        resolve(null);
                    }
                };

                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };

                ipcMain.once('capture:complete', onComplete);
                ipcMain.once('capture:cancel', onCancel);
                subWin.on('closed', onCancel);
            });
        });
    });

    // 3. 색상 선택 (Vision 2.0: 실시간 최적화)
    ipcMain.handle('pick:color', async () => {
        return await withHiddenWindow(async () => {
            let subWin = createColorWindow();

            // 색깔 선택 시작 시 한 번만 캡처 후 캐시 활용
            const colorUpdateHandler = async (_: any, pos: { x: number, y: number }) => {
                try {
                    // Vision 2.0: 캐시된 스크린샷에서 즉시 추출
                    const hex = await visionEngine.getPixelColor(pos.x, pos.y);
                    if (subWin && !subWin.isDestroyed()) {
                        subWin.webContents.send('color:update', hex);
                    }
                } catch (e) {
                    console.error('[Pick:Color] Update error:', e);
                }
            };

            ipcMain.on('color:get-at', colorUpdateHandler);

            return new Promise((resolve) => {
                let completed = false;

                const cleanup = () => {
                    if (completed) return;
                    completed = true;
                    ipcMain.removeListener('color:get-at', colorUpdateHandler);
                    ipcMain.removeListener('color:selected', onSelected);
                    ipcMain.removeListener('color:cancel', onCancel);
                    if (subWin && !subWin.isDestroyed()) subWin.close();
                    // 캐시 무효화
                    visionEngine.invalidateCache();
                };

                const onSelected = async (_: any, data: any) => {
                    try {
                        // 최종 선택 시 정확한 색상 추출
                        const hex = await visionEngine.getPixelColor(data.x, data.y);
                        cleanup();
                        resolve({ color: hex, x: data.x, y: data.y });
                    } catch (e) {
                        console.error('[Pick:Color] Selection error:', e);
                        cleanup();
                        resolve(null);
                    }
                };

                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };

                ipcMain.once('color:selected', onSelected);
                ipcMain.once('color:cancel', onCancel);
                subWin.on('closed', onCancel);
            });
        });
    });
}