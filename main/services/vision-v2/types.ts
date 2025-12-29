/**
 * Vision 2.0 타입 정의
 * 멀티모니터 완벽 지원을 위한 타입 시스템
 */

export interface MonitorInfo {
    id: number;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    scaleFactor: number;
    rotation: number;
    isPrimary: boolean;
}

export interface Point {
    x: number;
    y: number;
}

export interface LocalPoint extends Point {
    monitorId: number;
}

export interface PixelPoint extends Point {
    monitorId: number;
    scaleFactor: number;
}

export interface CachedImage {
    buffer: Buffer;  // PNG 버퍼
    monitorId: number;
    timestamp?: number;
}

export interface ImageResult {
    success: boolean;
    x?: number;
    y?: number;
    confidence?: number;
    monitorId?: number;
    error?: string;
}

export interface ColorResult {
    success: boolean;
    color?: string;
    error?: string;
}

export interface FindImageOptions {
    confidence?: number;          // 기본값: 0.75
    searchAllMonitors?: boolean;  // 기본값: true
    targetMonitorId?: number;     // 특정 모니터에서만 검색
    scales?: number[];            // 멀티스케일 검색 (기본값: [0.8, 0.9, 1.0, 1.1, 1.2])
    retries?: number;             // 재시도 횟수 (기본값: 3)
    retryInterval?: number;       // 재시도 간격 ms (기본값: 500)
}

export interface MatchColorOptions {
    targetColor: string;          // RGB hex 색상
    tolerance?: number;           // HSV 허용 범위 (기본값: 50)
    region?: number;              // 검사할 영역 크기 (기본값: 5x5)
}

export interface MatchResult {
    found: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    confidence?: number;
}

export interface HSV {
    h: number;  // 0-360
    s: number;  // 0-100
    v: number;  // 0-100
}
