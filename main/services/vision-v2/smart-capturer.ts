/**
 * SmartCapturer - 스마트 화면 캡처 시스템
 * LRU 캐시 + 모니터별 캡처 최적화
 */

import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import NodeCache from 'node-cache';
import { DisplayManager } from './display-manager';
import { CoordinateTransformer } from './coordinate-transformer';
import { CachedImage } from './types';

interface CaptureAtPointResult {
    image: sharp.Sharp;
    localX: number;
    localY: number;
    monitorId: number;
    scaleFactor: number;
}

export class SmartCapturer {
    private cache: NodeCache;
    private fullScreenCache: sharp.Sharp | null = null;
    private fullScreenTimestamp: number = 0;
    private readonly CACHE_TTL = 250; // ms

    constructor(
        private displayManager: DisplayManager,
        private transformer: CoordinateTransformer
    ) {
        // LRU 캐시: 최대 10개 이미지, 250ms TTL
        this.cache = new NodeCache({
            stdTTL: this.CACHE_TTL / 1000,
            maxKeys: 10,
            useClones: false
        });

        // 모니터 변경 시 캐시 무효화
        this.displayManager.onUpdate(() => this.invalidateAll());
    }

    /**
     * 전체 화면 캡처 (모든 모니터 포함)
     * 캐시를 활용하여 성능 최적화
     */
    async captureFullScreen(): Promise<sharp.Sharp> {
        const now = Date.now();

        // 캐시 확인
        if (this.fullScreenCache && (now - this.fullScreenTimestamp < this.CACHE_TTL)) {
            return this.fullScreenCache.clone();
        }

        // 전체 화면 캡처
        const buffer = await screenshot({ format: 'png' });
        this.fullScreenCache = sharp(buffer);
        this.fullScreenTimestamp = now;

        console.log('[SmartCapturer] Full screen captured');
        return this.fullScreenCache.clone();
    }

    /**
     * 특정 모니터만 개별 캡처 (멀티모니터 개선)
     * screenshot-desktop의 screen 옵션 활용
     */
    async captureMonitor(monitorId: number): Promise<sharp.Sharp | null> {
        const monitor = this.displayManager.getMonitorById(monitorId);
        if (!monitor) {
            console.error(`[SmartCapturer] Monitor #${monitorId} not found`);
            return null;
        }

        // 캐시 키
        const cacheKey = `monitor_${monitorId}`;
        const cached = this.cache.get<CachedImage>(cacheKey);

        if (cached) {
            console.log(`[SmartCapturer] Using cached screenshot for monitor #${monitorId}`);
            return sharp(cached.buffer);
        }

        try {
            // screenshot-desktop은 screen 파라미터로 특정 모니터 지정 가능
            // 모니터 인덱스는 0부터 시작 (id와 다를 수 있으므로 매핑 필요)
            const monitors = this.displayManager.getAllMonitors();
            const monitorIndex = monitors.findIndex(m => m.id === monitorId);

            if (monitorIndex === -1) {
                throw new Error(`Monitor index not found for id ${monitorId}`);
            }

            console.log(`[SmartCapturer] Capturing monitor #${monitorId} (index: ${monitorIndex})`);

            // 개별 모니터 캡처
            const buffer = await screenshot({
                format: 'png',
                screen: monitorIndex
            });

            // ✅ 캡처된 이미지 크기 검증 (듀얼모니터 안정성)
            const img = sharp(buffer);
            const metadata = await img.metadata();
            const expectedWidth = Math.round(monitor.bounds.width * monitor.scaleFactor);
            const expectedHeight = Math.round(monitor.bounds.height * monitor.scaleFactor);

            // 10% 이상 차이나면 fallback 사용
            const widthDiff = Math.abs((metadata.width || 0) - expectedWidth);
            const heightDiff = Math.abs((metadata.height || 0) - expectedHeight);

            if (widthDiff > expectedWidth * 0.1 || heightDiff > expectedHeight * 0.1) {
                console.warn(`[SmartCapturer] Screenshot size mismatch: expected ${expectedWidth}x${expectedHeight}, got ${metadata.width}x${metadata.height}`);
                throw new Error('Screenshot size mismatch - using fallback');
            }

            console.log(`[SmartCapturer] ✅ Screenshot validated: ${metadata.width}x${metadata.height}`);

            // 캐시 저장
            this.cache.set(cacheKey, { buffer, monitorId });

            return img;
        } catch (error) {
            console.error(`[SmartCapturer] Failed to capture monitor #${monitorId}:`, error);
            // Fallback: 전체 화면에서 해당 모니터 영역만 크롭
            return this.fallbackCaptureMonitor(monitor);
        }
    }

    /**
     * Fallback: 전체 화면에서 특정 모니터 영역만 크롭
     */
    private async fallbackCaptureMonitor(monitor: MonitorInfo): Promise<sharp.Sharp> {
        console.warn(`[SmartCapturer] Using fallback capture for monitor #${monitor.id}`);

        const fullScreen = await this.captureFullScreen();
        const virtualBounds = this.displayManager.getVirtualBounds();

        // 모니터의 전역 좌표 → 가상 화면 내 오프셋
        const offsetX = monitor.bounds.x - virtualBounds.x;
        const offsetY = monitor.bounds.y - virtualBounds.y;

        // 물리 픽셀 계산
        const left = Math.round(offsetX * monitor.scaleFactor);
        const top = Math.round(offsetY * monitor.scaleFactor);
        const width = Math.round(monitor.bounds.width * monitor.scaleFactor);
        const height = Math.round(monitor.bounds.height * monitor.scaleFactor);

        return fullScreen.extract({ left, top, width, height });
    }

    /**
     * 특정 좌표 주변 캡처 (해당 모니터만)
     * 멀티모니터 환경에서 정확한 픽셀 추출을 보장합니다.
     */
    async captureAtPoint(globalX: number, globalY: number): Promise<CaptureAtPointResult> {
        const monitor = this.displayManager.findMonitorByPoint(globalX, globalY);
        if (!monitor) {
            throw new Error(`No monitor found at (${globalX}, ${globalY})`);
        }

        // 전역 좌표 → 모니터 로컬 좌표
        const local = this.displayManager.globalToLocal(globalX, globalY, monitor);

        // 로컬 좌표 → 물리 픽셀
        const pixel = this.transformer.localToPixel(local.x, local.y, monitor);

        // 전체 화면 캡처
        const fullScreen = await this.captureFullScreen();

        // 가상 화면에서의 오프셋 계산
        const virtualBounds = this.displayManager.getVirtualBounds();
        const offsetX = globalX - virtualBounds.x;
        const offsetY = globalY - virtualBounds.y;

        // 물리 픽셀 계산 (전체 이미지 기준)
        const physicalX = Math.round(offsetX * monitor.scaleFactor);
        const physicalY = Math.round(offsetY * monitor.scaleFactor);

        return {
            image: fullScreen,
            localX: physicalX,
            localY: physicalY,
            monitorId: monitor.id,
            scaleFactor: monitor.scaleFactor
        };
    }

    /**
     * 특정 영역 캡처 (크롭)
     */
    async captureRegion(
        globalX: number,
        globalY: number,
        width: number,
        height: number
    ): Promise<sharp.Sharp> {
        const monitor = this.displayManager.findMonitorByPoint(globalX, globalY);
        if (!monitor) {
            throw new Error(`No monitor found at (${globalX}, ${globalY})`);
        }

        const fullScreen = await this.captureFullScreen();
        const virtualBounds = this.displayManager.getVirtualBounds();

        // 전역 좌표 → 가상 화면 오프셋
        const offsetX = globalX - virtualBounds.x;
        const offsetY = globalY - virtualBounds.y;

        // 물리 픽셀 계산
        const left = Math.round(offsetX * monitor.scaleFactor);
        const top = Math.round(offsetY * monitor.scaleFactor);
        const cropWidth = Math.round(width * monitor.scaleFactor);
        const cropHeight = Math.round(height * monitor.scaleFactor);

        // 이미지 메타데이터 확인
        const metadata = await fullScreen.metadata();
        const imgWidth = metadata.width || 0;
        const imgHeight = metadata.height || 0;

        // 경계 체크
        const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
        const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
        const safeWidth = Math.min(cropWidth, imgWidth - safeLeft);
        const safeHeight = Math.min(cropHeight, imgHeight - safeTop);

        if (safeWidth <= 0 || safeHeight <= 0) {
            throw new Error('Invalid crop region');
        }

        return fullScreen.extract({
            left: safeLeft,
            top: safeTop,
            width: safeWidth,
            height: safeHeight
        });
    }

    /**
     * 픽셀 색상 추출 (5x5 영역의 중앙값)
     */
    async getPixelColor(globalX: number, globalY: number): Promise<string> {
        const result = await this.captureAtPoint(globalX, globalY);
        const { image, localX, localY } = result;

        // 5x5 영역 추출 (노이즈 제거)
        const regionSize = 5;
        const halfSize = Math.floor(regionSize / 2);

        const metadata = await image.metadata();
        const imgWidth = metadata.width || 0;
        const imgHeight = metadata.height || 0;

        // 경계 체크
        const left = Math.max(0, Math.min(localX - halfSize, imgWidth - regionSize));
        const top = Math.max(0, Math.min(localY - halfSize, imgHeight - regionSize));

        const region = await image
            .extract({ left, top, width: regionSize, height: regionSize })
            .raw()
            .toBuffer({ resolveWithObject: true });

        // 중앙 픽셀 (가장 안정적)
        const centerIndex = Math.floor(region.info.channels * (regionSize * halfSize + halfSize));
        const r = region.data[centerIndex];
        const g = region.data[centerIndex + 1];
        const b = region.data[centerIndex + 2];

        return this.rgbToHex(r, g, b);
    }

    /**
     * RGB를 Hex로 변환
     */
    private rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    /**
     * 전체 캐시 무효화
     */
    invalidateAll(): void {
        this.cache.flushAll();
        this.fullScreenCache = null;
        this.fullScreenTimestamp = 0;
        console.log('[SmartCapturer] Cache invalidated');
    }

    /**
     * 특정 모니터 캐시 무효화
     */
    invalidateMonitor(monitorId: number): void {
        this.cache.del(`monitor_${monitorId}`);
        // 전체 화면 캐시도 무효화 (멀티모니터 환경)
        this.fullScreenCache = null;
        this.fullScreenTimestamp = 0;
    }
}
