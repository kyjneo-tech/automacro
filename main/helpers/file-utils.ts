import fs from 'fs';
import path from 'path';

export const fileUtils = {
    /**
     * 오래된 타겟 이미지 파일을 정리합니다.
     * @param targetDir 정리할 디렉토리 경로
     * @param maxAgeDays 유지할 최대 기간 (일 단위)
     */
    cleanOldTargets(targetDir: string, maxAgeDays: number = 7) {
        if (!fs.existsSync(targetDir)) return;

        const now = Date.now();
        const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

        try {
            const files = fs.readdirSync(targetDir);
            let deletedCount = 0;

            files.forEach(file => {
                if (file.startsWith('target-') && file.endsWith('.png')) {
                    const filePath = path.join(targetDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (now - stats.mtimeMs > maxAgeMs) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                }
            });

            if (deletedCount > 0) {
                console.log(`[Cleanup] Deleted ${deletedCount} old target images.`);
            }
        } catch (error) {
            console.error('[Cleanup] Failed to clean old targets:', error);
        }
    }
};
