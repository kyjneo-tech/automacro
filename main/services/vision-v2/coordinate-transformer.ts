/**
 * CoordinateTransformer - 좌표 변환 시스템
 * 전역 좌표 ↔ 물리 픽셀 좌표 양방향 변환
 */

import { DisplayManager } from './display-manager';
import { Point, PixelPoint, MonitorInfo } from './types';

export class CoordinateTransformer {
    constructor(private displayManager: DisplayManager) {}

    /**
     * 전역 논리 좌표 → 물리 픽셀 좌표 변환
     * screenshot-desktop이 찍은 이미지에서의 정확한 픽셀 위치를 계산합니다.
     */
    globalToPixel(globalX: number, globalY: number): PixelPoint {
        const monitor = this.displayManager.findMonitorByPoint(globalX, globalY);
        if (!monitor) {
            throw new Error(`No monitor found for point (${globalX}, ${globalY})`);
        }

        const local = this.displayManager.globalToLocal(globalX, globalY, monitor);
        const virtualBounds = this.displayManager.getVirtualBounds();

        // screenshot-desktop은 전체 가상 화면을 찍기 때문에
        // virtualBounds의 왼쪽 위(minX, minY)가 (0, 0)이 됩니다.
        const offsetX = globalX - virtualBounds.x;
        const offsetY = globalY - virtualBounds.y;

        // 해당 모니터의 scaleFactor를 적용
        // 주의: 멀티 모니터 환경에서 각 모니터의 스케일이 다를 수 있음
        // screenshot-desktop은 OS의 기본 스케일을 따르므로,
        // 정확한 픽셀 계산을 위해서는 각 모니터별 캡처가 필요합니다.

        // 여기서는 간단한 계산을 위해 현재 모니터의 스케일을 사용
        const pixelX = Math.round(offsetX * monitor.scaleFactor);
        const pixelY = Math.round(offsetY * monitor.scaleFactor);

        return {
            x: pixelX,
            y: pixelY,
            monitorId: monitor.id,
            scaleFactor: monitor.scaleFactor
        };
    }

    /**
     * 물리 픽셀 좌표 → 전역 논리 좌표 변환 (역변환)
     */
    pixelToGlobal(pixelX: number, pixelY: number, monitorId: number): Point {
        const monitor = this.displayManager.getMonitorById(monitorId);
        if (!monitor) {
            throw new Error(`Monitor ${monitorId} not found`);
        }

        const virtualBounds = this.displayManager.getVirtualBounds();

        // 물리 픽셀 → 논리 좌표
        const offsetX = pixelX / monitor.scaleFactor;
        const offsetY = pixelY / monitor.scaleFactor;

        // 가상 화면 기준 → 전역 좌표
        const globalX = Math.round(virtualBounds.x + offsetX);
        const globalY = Math.round(virtualBounds.y + offsetY);

        return { x: globalX, y: globalY };
    }

    /**
     * 모니터별 로컬 좌표를 물리 픽셀로 변환
     * (모니터 내부 좌표 → 해당 모니터 이미지의 픽셀)
     */
    localToPixel(localX: number, localY: number, monitor: MonitorInfo): Point {
        return {
            x: Math.round(localX * monitor.scaleFactor),
            y: Math.round(localY * monitor.scaleFactor)
        };
    }

    /**
     * 물리 픽셀을 모니터별 로컬 좌표로 변환
     */
    pixelToLocal(pixelX: number, pixelY: number, monitor: MonitorInfo): Point {
        return {
            x: Math.round(pixelX / monitor.scaleFactor),
            y: Math.round(pixelY / monitor.scaleFactor)
        };
    }

    /**
     * 특정 좌표가 여러 모니터 중 어디에 속하는지 디버깅 정보 출력
     */
    debugPoint(x: number, y: number): void {
        const monitor = this.displayManager.findMonitorByPoint(x, y);
        if (!monitor) {
            console.log(`[CoordinateTransformer] Point (${x}, ${y}) is outside all monitors`);
            return;
        }

        const local = this.displayManager.globalToLocal(x, y, monitor);
        const pixel = this.globalToPixel(x, y);

        console.log(`[CoordinateTransformer] Point (${x}, ${y}):
  Monitor: #${monitor.id} (${monitor.isPrimary ? 'Primary' : 'Secondary'})
  Bounds: ${monitor.bounds.x},${monitor.bounds.y} ${monitor.bounds.width}x${monitor.bounds.height}
  Scale: ${monitor.scaleFactor}x
  Local: (${local.x}, ${local.y})
  Pixel: (${pixel.x}, ${pixel.y})`);
    }
}
