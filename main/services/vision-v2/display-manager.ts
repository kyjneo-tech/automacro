/**
 * DisplayManager - 멀티모니터 관리 시스템
 * 모든 모니터의 정보를 추적하고 좌표 변환을 담당합니다.
 */

import { screen } from 'electron';
import { MonitorInfo, Point, LocalPoint } from './types';

export class DisplayManager {
    private monitors: MonitorInfo[] = [];
    private updateCallbacks: Array<() => void> = [];
    private initialized: boolean = false;

    constructor() {
        // 초기화는 명시적으로 호출될 때까지 지연
    }

    /**
     * DisplayManager 초기화 (app.whenReady() 이후 호출 필수)
     */
    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        this.refreshMonitors();

        // 모니터 연결/해제 감지 (Electron 이벤트)
        screen.on('display-added', () => {
            console.log('[DisplayManager] Display added');
            this.refreshMonitors();
            this.notifyUpdate();
        });

        screen.on('display-removed', () => {
            console.log('[DisplayManager] Display removed');
            this.refreshMonitors();
            this.notifyUpdate();
        });

        screen.on('display-metrics-changed', () => {
            console.log('[DisplayManager] Display metrics changed');
            this.refreshMonitors();
            this.notifyUpdate();
        });

        console.log('[DisplayManager] Initialized');
    }

    /**
     * 모든 모니터 정보를 갱신합니다.
     */
    refreshMonitors(): MonitorInfo[] {
        if (!this.initialized) {
            console.warn('[DisplayManager] Not initialized yet, skipping refresh');
            return [];
        }

        const displays = screen.getAllDisplays();
        const primaryId = screen.getPrimaryDisplay().id;

        this.monitors = displays.map(d => ({
            id: d.id,
            bounds: { ...d.bounds },
            scaleFactor: d.scaleFactor,
            rotation: d.rotation,
            isPrimary: d.id === primaryId
        }));

        console.log(`[DisplayManager] Refreshed ${this.monitors.length} monitors:`,
            this.monitors.map(m => `#${m.id} ${m.bounds.width}x${m.bounds.height} @${m.scaleFactor}x`)
        );

        return this.monitors;
    }

    /**
     * 모든 모니터 정보를 반환합니다.
     */
    getAllMonitors(): MonitorInfo[] {
        return [...this.monitors];
    }

    /**
     * 주 모니터를 반환합니다.
     */
    getPrimaryMonitor(): MonitorInfo | null {
        return this.monitors.find(m => m.isPrimary) || null;
    }

    /**
     * ID로 모니터를 찾습니다.
     */
    getMonitorById(id: number): MonitorInfo | null {
        return this.monitors.find(m => m.id === id) || null;
    }

    /**
     * 전역 좌표가 속한 모니터를 찾습니다.
     * 여러 모니터에 걸친 경우 먼저 찾은 것을 반환합니다.
     */
    findMonitorByPoint(x: number, y: number): MonitorInfo | null {
        const found = this.monitors.find(m => {
            const { bounds } = m;
            return x >= bounds.x &&
                   x < bounds.x + bounds.width &&
                   y >= bounds.y &&
                   y < bounds.y + bounds.height;
        });

        // 어느 모니터에도 속하지 않으면 주 모니터 반환
        return found || this.getPrimaryMonitor();
    }

    /**
     * 전역 좌표 → 모니터 로컬 좌표 변환
     */
    globalToLocal(x: number, y: number, monitor: MonitorInfo): LocalPoint {
        return {
            x: x - monitor.bounds.x,
            y: y - monitor.bounds.y,
            monitorId: monitor.id
        };
    }

    /**
     * 모니터 로컬 좌표 → 전역 좌표 변환
     */
    localToGlobal(localX: number, localY: number, monitorId: number): Point | null {
        const monitor = this.getMonitorById(monitorId);
        if (!monitor) return null;

        return {
            x: monitor.bounds.x + localX,
            y: monitor.bounds.y + localY
        };
    }

    /**
     * 전체 가상 화면의 경계를 구합니다.
     * (screenshot-desktop이 캡처하는 영역)
     */
    getVirtualBounds() {
        if (this.monitors.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.monitors.forEach(m => {
            const { x, y, width, height } = m.bounds;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * 모니터 업데이트 콜백 등록
     */
    onUpdate(callback: () => void) {
        this.updateCallbacks.push(callback);
    }

    private notifyUpdate() {
        this.updateCallbacks.forEach(cb => cb());
    }
}

// 싱글톤 인스턴스
export const displayManager = new DisplayManager();
