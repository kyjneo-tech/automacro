/**
 * VisionEngine - Vision 2.0 통합 엔진
 * 멀티모니터 완벽 지원 + 고정확도 이미지/색깔 인식
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { DisplayManager, displayManager } from './display-manager';
import { CoordinateTransformer } from './coordinate-transformer';
import { SmartCapturer } from './smart-capturer';
import { TemplateMatcher } from './template-matcher';
import { FindImageOptions, ImageResult, ColorResult, HSV } from './types';

export class VisionEngine {
    private displayManager: DisplayManager;
    private transformer: CoordinateTransformer;
    private capturer: SmartCapturer;
    private matcher: TemplateMatcher;
    private initialized: boolean = false;

    constructor() {
        this.displayManager = displayManager;
        this.transformer = new CoordinateTransformer(this.displayManager);
        this.capturer = new SmartCapturer(this.displayManager, this.transformer);
        this.matcher = new TemplateMatcher();
    }

    /**
     * VisionEngine 초기화 (app.whenReady() 이후 호출)
     */
    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        this.displayManager.initialize();

        console.log('[VisionEngine] Initialized with monitors:',
            this.displayManager.getAllMonitors().map(m => `#${m.id} ${m.bounds.width}x${m.bounds.height}`)
        );
    }

    /**
     * 픽셀 색상 가져오기 (5x5 영역 기반)
     */
    async getPixelColor(x: number, y: number): Promise<string> {
        this.ensureInitialized();
        try {
            const color = await this.capturer.getPixelColor(x, y);
            console.log(`[VisionEngine] Color at (${x}, ${y}): ${color}`);
            return color;
        } catch (error) {
            console.error('[VisionEngine] getPixelColor failed:', error);
            return '#000000';
        }
    }

    private ensureInitialized() {
        if (!this.initialized) {
            this.initialize();
        }
    }

    /**
     * 이미지 찾기 (멀티모니터 + 멀티스케일)
     */
    async findImage(imagePath: string, options: FindImageOptions = {}): Promise<ImageResult> {
        this.ensureInitialized();
        const {
            confidence = 0.75,
            searchAllMonitors = true,
            targetMonitorId,
            scales = [0.9, 1.0, 1.1], // ✅ 5개→3개로 축소 (40% 속도 향상)
            retries = 2, // ✅ 3→2로 감소
            retryInterval = 300 // ✅ 500ms→300ms로 단축
        } = options;

        // 경로 정규화
        const fullPath = this.resolveImagePath(imagePath);
        if (!fs.existsSync(fullPath)) {
            console.error(`[VisionEngine] Image not found: ${fullPath}`);
            return { success: false, error: `파일을 찾을 수 없습니다: ${fullPath}` };
        }

        console.log(`[VisionEngine] Searching for: ${fullPath} (confidence: ${confidence})`);

        // 검색 대상 모니터 결정
        const monitors = targetMonitorId
            ? [this.displayManager.getMonitorById(targetMonitorId)!]
            : (searchAllMonitors
                ? this.displayManager.getAllMonitors()
                : [this.displayManager.getPrimaryMonitor()!]);

        // 재시도 로직
        for (let attempt = 1; attempt <= retries; attempt++) {
            for (const monitor of monitors) {
                if (!monitor) continue;

                console.log(`[VisionEngine] Searching on monitor #${monitor.id} (${monitor.bounds.width}x${monitor.bounds.height}) - attempt ${attempt}/${retries}`);

                // ✅ 개별 모니터 캡처 (멀티모니터 개선)
                const screenshot = await this.capturer.captureMonitor(monitor.id);
                if (!screenshot) {
                    console.warn(`[VisionEngine] Failed to capture monitor #${monitor.id}, skipping`);
                    continue;
                }

                // 멀티스케일 매칭
                const result = await this.matcher.multiScaleMatch(screenshot, fullPath, {
                    confidence,
                    scales
                });

                if (result.found && result.x !== undefined && result.y !== undefined) {
                    // ✅ 간단한 좌표 변환: 모니터 로컬 물리 픽셀 → 전역 좌표
                    const centerX = result.x + (result.width || 0) / 2;
                    const centerY = result.y + (result.height || 0) / 2;

                    // 물리 픽셀 → 논리 픽셀 (scaleFactor 적용)
                    const localLogicalX = centerX / monitor.scaleFactor;
                    const localLogicalY = centerY / monitor.scaleFactor;

                    // 모니터 bounds 기준으로 전역 좌표 계산
                    let globalX = Math.round(monitor.bounds.x + localLogicalX);
                    let globalY = Math.round(monitor.bounds.y + localLogicalY);

                    // ✅ 좌표 범위 검증 및 클램핑 (듀얼모니터 안정성)
                    const inBounds = (
                        globalX >= monitor.bounds.x &&
                        globalX < monitor.bounds.x + monitor.bounds.width &&
                        globalY >= monitor.bounds.y &&
                        globalY < monitor.bounds.y + monitor.bounds.height
                    );

                    if (!inBounds) {
                        console.warn(`[VisionEngine] Coordinate out of bounds, clamping: (${globalX}, ${globalY})`);
                        globalX = Math.max(monitor.bounds.x, Math.min(globalX, monitor.bounds.x + monitor.bounds.width - 1));
                        globalY = Math.max(monitor.bounds.y, Math.min(globalY, monitor.bounds.y + monitor.bounds.height - 1));
                        console.warn(`[VisionEngine] Clamped to: (${globalX}, ${globalY})`);
                    }

                    console.log(`[VisionEngine] ✅ Image found on monitor #${monitor.id} at global (${globalX}, ${globalY}) with confidence ${result.confidence?.toFixed(3)}`);

                    return {
                        success: true,
                        x: globalX,
                        y: globalY,
                        confidence: result.confidence,
                        monitorId: monitor.id
                    };
                }
            }

            // 마지막 시도가 아니면 대기
            if (attempt < retries) {
                console.log(`[VisionEngine] Retry ${attempt}/${retries} failed, waiting ${retryInterval}ms...`);
                await new Promise(r => setTimeout(r, retryInterval));
                this.capturer.invalidateAll(); // 캐시 무효화
            }
        }

        console.log('[VisionEngine] Image not found after all attempts');
        return { success: false, error: '화면에서 이미지를 찾을 수 없습니다.' };
    }

    /**
     * 색상 매칭 (HSV 기반, 관대한 허용 범위)
     */
    async matchColor(x: number, y: number, targetColor: string, tolerance: number = 50): Promise<ColorResult> {
        this.ensureInitialized();
        try {
            const currentColor = await this.getPixelColor(x, y);

            // RGB → HSV 변환
            const targetHsv = this.rgbToHsv(targetColor);
            const currentHsv = this.rgbToHsv(currentColor);

            // HSV 거리 계산 (Hue는 순환 값이므로 특별 처리)
            const hDiff = Math.min(
                Math.abs(targetHsv.h - currentHsv.h),
                360 - Math.abs(targetHsv.h - currentHsv.h)
            );
            const sDiff = Math.abs(targetHsv.s - currentHsv.s);
            const vDiff = Math.abs(targetHsv.v - currentHsv.v);

            // 가중치 적용 (H가 가장 중요)
            const distance = Math.sqrt(
                Math.pow(hDiff * 2, 2) +
                Math.pow(sDiff, 2) +
                Math.pow(vDiff, 2)
            );

            const isMatch = distance <= tolerance;

            console.log(`[VisionEngine] Color match: target=${targetColor} current=${currentColor} distance=${distance.toFixed(1)} match=${isMatch}`);

            return {
                success: isMatch,
                color: currentColor
            };
        } catch (error) {
            console.error('[VisionEngine] matchColor failed:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * 이미지 경로 해결
     */
    private resolveImagePath(imagePath: string): string {
        if (path.isAbsolute(imagePath)) {
            return imagePath;
        }

        // 상대 경로 처리
        const isProd = process.env.NODE_ENV === 'production';
        const projectRoot = isProd
            ? process.resourcesPath
            : path.join(app.getAppPath(), '..');

        return path.resolve(projectRoot, imagePath);
    }

    /**
     * RGB Hex → HSV 변환
     */
    private rgbToHsv(hex: string): HSV {
        const r = parseInt(hex.substring(1, 3), 16) / 255;
        const g = parseInt(hex.substring(3, 5), 16) / 255;
        const b = parseInt(hex.substring(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        if (delta !== 0) {
            if (max === r) {
                h = 60 * (((g - b) / delta) % 6);
            } else if (max === g) {
                h = 60 * (((b - r) / delta) + 2);
            } else {
                h = 60 * (((r - g) / delta) + 4);
            }
        }
        if (h < 0) h += 360;

        const s = max === 0 ? 0 : (delta / max) * 100;
        const v = max * 100;

        return { h, s, v };
    }

    /**
     * 캐시 무효화
     */
    invalidateCache(): void {
        this.capturer.invalidateAll();
    }

    /**
     * 디버그 정보 출력
     */
    debugInfo(): void {
        console.log('=== VisionEngine Debug Info ===');
        console.log('Monitors:', this.displayManager.getAllMonitors());
        console.log('Virtual Bounds:', this.displayManager.getVirtualBounds());
    }
}

// 싱글톤 인스턴스
export const visionEngine = new VisionEngine();
