import { app, systemPreferences, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import screenshot from 'screenshot-desktop';
import { displayHelper } from '../helpers/display-helper';
import { getOpenCVStatus } from './vision-v2/template-matcher';

export const diagnosticService = {
    async runAllChecks() {
        const results = {
            os: process.platform,
            arch: process.arch,
            accessibility: false,
            displayCount: 0,
            screenshotTest: false,
            writePermission: false,
            opencv: getOpenCVStatus(),
            env: process.env.NODE_ENV
        };

        // 1. 권한 체크
        if (process.platform === 'darwin') {
            results.accessibility = systemPreferences.isTrustedAccessibilityClient(false);
        } else {
            results.accessibility = true; // Windows는 보통 기본 허용
        }

        // 2. 디스플레이 체크
        const displays = screen.getAllDisplays();
        results.displayCount = displays.length;

        // 3. 스크린샷 및 좌표 변환 테스트
        try {
            const img = await screenshot({ format: 'png' });
            if (img && img.length > 0) {
                results.screenshotTest = true;
            }
            
            // 좌표 변환 로직 테스트 (Primary Display (0,0) -> Pixel (0,0) 근처 확인)
            const pixel = displayHelper.screenToPixel(0, 0);
            console.log('[Diagnostic] Coordinate test (0,0) ->', pixel);
        } catch (e) {
            console.error('[Diagnostic] Screenshot test failed:', e);
        }

        // 4. 파일 쓰기 권한 체크 (targets 폴더)
        try {
            const isProd = process.env.NODE_ENV === 'production';
            const projectRoot = isProd ? process.resourcesPath : path.join(__dirname, '..', '..');
            const testPath = path.join(projectRoot, 'targets', '.test-write');
            
            if (!fs.existsSync(path.dirname(testPath))) {
                fs.mkdirSync(path.dirname(testPath), { recursive: true });
            }
            fs.writeFileSync(testPath, 'test');
            fs.unlinkSync(testPath);
            results.writePermission = true;
        } catch (e) {
            console.error('[Diagnostic] Write permission test failed:', e);
        }

        return results;
    }
};
