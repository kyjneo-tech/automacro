import { screen } from 'electron';

export interface Point {
    x: number;
    y: number;
}

export interface DisplayInfo {
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    isPrimary: boolean;
}

export const displayHelper = {
    /**
     * 모든 디스플레이 정보를 가져옵니다.
     */
    getDisplays(): DisplayInfo[] {
        const primaryId = screen.getPrimaryDisplay().id;
        return screen.getAllDisplays().map(d => ({
            id: d.id,
            bounds: d.bounds,
            scaleFactor: d.scaleFactor,
            isPrimary: d.id === primaryId
        }));
    },

    /**
     * 전체 디스플레이를 아우르는 가상 캔버스의 최소/최대 좌표를 구합니다.
     * screenshot-desktop이 캡처하는 이미지의 기준점과 크기를 알기 위함입니다.
     */
    getVirtualScreenBounds() {
        const displays = screen.getAllDisplays();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        displays.forEach(d => {
            const { x, y, width, height } = d.bounds;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },

    /**
     * Electron의 논리 좌표(Logical)를 스크린샷 이미지의 물리 좌표(Physical Pixel)로 변환합니다.
     * macOS/Windows 멀티 모니터 및 Retina 대응 핵심 로직입니다.
     */
    screenToPixel(logicalX: number, logicalY: number): Point & { scaleFactor: number } {
        const displays = screen.getAllDisplays();
        const virtualBounds = this.getVirtualScreenBounds();

        // 1. 해당 좌표가 어느 디스플레이에 속하는지 찾음
        const targetDisplay = displays.find(d => {
            const { x, y, width, height } = d.bounds;
            return logicalX >= x && logicalX < x + width &&
                   logicalY >= y && logicalY < y + height;
        }) || screen.getPrimaryDisplay();

        // 2. 전체 가상 화면의 시작점(minX, minY)으로부터의 오프셋 계산
        // screenshot-desktop은 보통 모든 화면을 포함하는 가장 왼쪽 위를 (0,0)으로 잡습니다.
        const offsetX = logicalX - virtualBounds.x;
        const offsetY = logicalY - virtualBounds.y;

        // 3. 해당 디스플레이의 scaleFactor를 적용하여 물리 픽셀 좌표 계산
        // 주의: 멀티 모니터 환경에서 모니터마다 scaleFactor가 다를 경우 
        // 전체 이미지에서의 위치 계산은 더 복잡해질 수 있으나, 
        // 대부분의 OS 스크린샷 라이브러리는 현재 디스플레이 세팅을 따릅니다.
        const pixelX = Math.round(offsetX * targetDisplay.scaleFactor);
        const pixelY = Math.round(offsetY * targetDisplay.scaleFactor);

        return { 
            x: pixelX, 
            y: pixelY, 
            scaleFactor: targetDisplay.scaleFactor 
        };
    },

    /**
     * 물리 픽셀 크기(이미지 크기)를 논리 좌표 크기로 변환합니다.
     */
    pixelToLogicalSize(pixelSize: number, scaleFactor: number): number {
        return Math.round(pixelSize / scaleFactor);
    }
};
