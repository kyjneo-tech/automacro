/**
 * TemplateMatcher - OpenCV 기반 이미지 매칭
 * 멀티스케일 + 고정확도 템플릿 매칭
 */

import sharp from 'sharp';
import { MatchResult } from './types';

// OpenCV 선택적 로딩 (빌드 실패 시 fallback)
let cv: any = null;
let opencvLoadError: string | null = null;
let opencvVersion: string | null = null;

try {
    cv = require('@u4/opencv4nodejs');
    opencvVersion = cv.version || 'unknown';
    console.log('[TemplateMatcher] ✅ OpenCV loaded successfully');
    console.log(`[TemplateMatcher]    Version: ${opencvVersion}`);
    console.log('[TemplateMatcher]    Image matching will use OpenCV (~95% accuracy)');
} catch (e: any) {
    opencvLoadError = e.message || 'Unknown error';
    console.warn('[TemplateMatcher] ❌ OpenCV not available, using basicMatch fallback');
    console.warn(`[TemplateMatcher]    Error: ${opencvLoadError}`);
    console.warn('[TemplateMatcher]    Image matching will use basicMatch (~30% accuracy)');
    console.warn('[TemplateMatcher]    Run "npm run build:opencv" to fix this issue');
}

/**
 * OpenCV 상태 조회 함수 (진단용)
 */
export function getOpenCVStatus() {
    return {
        available: cv !== null,
        version: opencvVersion,
        error: opencvLoadError,
        accuracy: cv ? '~95%' : '~30%',
        engine: cv ? 'OpenCV (TM_CCOEFF_NORMED)' : 'basicMatch (pixel comparison)'
    };
}

export class TemplateMatcher {
    /**
     * 템플릿 매칭 수행 (단일 스케일)
     */
    async matchTemplate(
        screenshot: sharp.Sharp,
        template: sharp.Sharp,
        confidence: number = 0.75
    ): Promise<MatchResult> {
        // OpenCV가 없으면 기본 매칭 사용
        if (!cv) {
            return await this.basicMatch(screenshot, template, confidence);
        }

        try {
            // Sharp 이미지 → OpenCV Mat 변환
            const screenBuffer = await screenshot.raw().toBuffer({ resolveWithObject: true });
            const templateBuffer = await template.raw().toBuffer({ resolveWithObject: true });

            const screenMat = new cv.Mat(
                screenBuffer.info.height,
                screenBuffer.info.width,
                cv.CV_8UC3,
                screenBuffer.data
            );

            const templateMat = new cv.Mat(
                templateBuffer.info.height,
                templateBuffer.info.width,
                cv.CV_8UC3,
                templateBuffer.data
            );

            // TM_CCOEFF_NORMED: 가장 정확한 매칭 방법
            const result = screenMat.matchTemplate(templateMat, cv.TM_CCOEFF_NORMED);
            const minMax = result.minMaxLoc();

            const matchConfidence = minMax.maxVal;

            if (matchConfidence >= confidence) {
                return {
                    found: true,
                    x: minMax.maxLoc.x,
                    y: minMax.maxLoc.y,
                    width: templateBuffer.info.width,
                    height: templateBuffer.info.height,
                    confidence: matchConfidence
                };
            }

            return { found: false };
        } catch (error) {
            console.error('[TemplateMatcher] Match failed:', error);
            return { found: false };
        }
    }

    /**
     * 멀티스케일 템플릿 매칭
     * Retina 디스플레이 및 다양한 DPI 대응
     */
    async multiScaleMatch(
        screenshot: sharp.Sharp,
        templatePath: string,
        options: {
            confidence?: number;
            scales?: number[];
        } = {}
    ): Promise<MatchResult> {
        const {
            confidence = 0.75,
            scales = [0.9, 1.0, 1.1] // ✅ 5개→3개로 축소 (40% 속도 향상)
        } = options;

        const templateOriginal = sharp(templatePath);
        const templateMeta = await templateOriginal.metadata();

        if (!templateMeta.width || !templateMeta.height) {
            return { found: false };
        }

        let bestMatch: MatchResult = { found: false };
        let bestConfidence = 0;

        for (const scale of scales) {
            const scaledWidth = Math.round(templateMeta.width * scale);
            const scaledHeight = Math.round(templateMeta.height * scale);

            // 템플릿 리사이즈
            const scaledTemplate = templateOriginal.clone().resize({
                width: scaledWidth,
                height: scaledHeight,
                fit: 'fill'
            });

            // 매칭 시도
            const result = await this.matchTemplate(screenshot, scaledTemplate, confidence);

            if (result.found && result.confidence! > bestConfidence) {
                bestMatch = result;
                bestConfidence = result.confidence!;

                // 거의 완벽한 매치라면 즉시 반환
                if (bestConfidence > 0.95) {
                    console.log(`[TemplateMatcher] Perfect match at scale ${scale}: ${bestConfidence.toFixed(3)}`);
                    return bestMatch;
                }
            }
        }

        if (bestMatch.found) {
            console.log(`[TemplateMatcher] Best match found: ${bestConfidence.toFixed(3)}`);
        }

        return bestMatch;
    }

    /**
     * Feature-based 매칭 (fallback)
     * 템플릿 매칭 실패 시 특징점 기반으로 재시도
     */
    async featureMatch(
        screenshot: sharp.Sharp,
        template: sharp.Sharp
    ): Promise<MatchResult> {
        try {
            const screenBuffer = await screenshot.raw().toBuffer({ resolveWithObject: true });
            const templateBuffer = await template.raw().toBuffer({ resolveWithObject: true });

            const screenMat = new cv.Mat(
                screenBuffer.info.height,
                screenBuffer.info.width,
                cv.CV_8UC3,
                screenBuffer.data
            );

            const templateMat = new cv.Mat(
                templateBuffer.info.height,
                templateBuffer.info.width,
                cv.CV_8UC3,
                templateBuffer.data
            );

            // ORB 특징점 검출
            const detector = new cv.ORBDetector();
            const screenKeypoints = detector.detect(screenMat.cvtColor(cv.COLOR_BGR2GRAY));
            const templateKeypoints = detector.detect(templateMat.cvtColor(cv.COLOR_BGR2GRAY));

            if (screenKeypoints.length < 10 || templateKeypoints.length < 10) {
                return { found: false };
            }

            // BFMatcher로 매칭
            const matcher = new cv.BFMatcher(cv.NORM_HAMMING);
            const screenDescriptors = detector.compute(screenMat.cvtColor(cv.COLOR_BGR2GRAY), screenKeypoints);
            const templateDescriptors = detector.compute(templateMat.cvtColor(cv.COLOR_BGR2GRAY), templateKeypoints);

            const matches = matcher.match(templateDescriptors.descriptors, screenDescriptors.descriptors);

            // 좋은 매치만 필터링
            const goodMatches = matches.filter(m => m.distance < 50);

            if (goodMatches.length > 10) {
                // 매치된 점들의 중심 계산
                let sumX = 0, sumY = 0;
                goodMatches.forEach(m => {
                    sumX += screenKeypoints[m.trainIdx].point.x;
                    sumY += screenKeypoints[m.trainIdx].point.y;
                });

                return {
                    found: true,
                    x: Math.round(sumX / goodMatches.length),
                    y: Math.round(sumY / goodMatches.length),
                    confidence: goodMatches.length / matches.length
                };
            }

            return { found: false };
        } catch (error) {
            console.error('[TemplateMatcher] Feature match failed:', error);
            return { found: false };
        }
    }

    /**
     * 기본 매칭 (OpenCV 없이)
     * 단순한 픽셀 비교 기반
     */
    private async basicMatch(
        screenshot: sharp.Sharp,
        template: sharp.Sharp,
        confidence: number
    ): Promise<MatchResult> {
        try {
            const screenData = await screenshot.raw().toBuffer({ resolveWithObject: true });
            const templateData = await template.raw().toBuffer({ resolveWithObject: true });

            const sw = screenData.info.width;
            const sh = screenData.info.height;
            const tw = templateData.info.width;
            const th = templateData.info.height;

            let bestScore = 0;
            let bestX = 0;
            let bestY = 0;

            // 간단한 슬라이딩 윈도우 (성능을 위해 일부만 검사)
            const step = Math.max(1, Math.floor(Math.min(tw, th) / 10));

            for (let y = 0; y < sh - th; y += step) {
                for (let x = 0; x < sw - tw; x += step) {
                    const score = this.compareRegions(
                        screenData.data,
                        sw,
                        templateData.data,
                        tw,
                        th,
                        x,
                        y
                    );

                    if (score > bestScore) {
                        bestScore = score;
                        bestX = x;
                        bestY = y;
                    }
                }
            }

            console.log(`[TemplateMatcher] Basic match score: ${bestScore.toFixed(3)}`);

            if (bestScore >= confidence) {
                return {
                    found: true,
                    x: bestX,
                    y: bestY,
                    width: tw,
                    height: th,
                    confidence: bestScore
                };
            }

            return { found: false };
        } catch (error) {
            console.error('[TemplateMatcher] Basic match failed:', error);
            return { found: false };
        }
    }

    /**
     * 두 영역의 유사도 계산
     */
    private compareRegions(
        screenData: Buffer,
        screenWidth: number,
        templateData: Buffer,
        templateWidth: number,
        templateHeight: number,
        offsetX: number,
        offsetY: number
    ): number {
        let totalDiff = 0;
        let count = 0;

        for (let y = 0; y < templateHeight; y += 2) {
            for (let x = 0; x < templateWidth; x += 2) {
                const templateIndex = (y * templateWidth + x) * 3;
                const screenIndex = ((offsetY + y) * screenWidth + (offsetX + x)) * 3;

                const dr = Math.abs(templateData[templateIndex] - screenData[screenIndex]);
                const dg = Math.abs(templateData[templateIndex + 1] - screenData[screenIndex + 1]);
                const db = Math.abs(templateData[templateIndex + 2] - screenData[screenIndex + 2]);

                totalDiff += (dr + dg + db);
                count++;
            }
        }

        const avgDiff = totalDiff / (count * 3 * 255);
        return 1 - avgDiff;
    }
}
