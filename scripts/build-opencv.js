#!/usr/bin/env node

/**
 * OpenCV 자동 빌드 스크립트
 * @u4/opencv4nodejs를 자동으로 빌드하고 검증합니다.
 * 빌드 실패 시에도 앱이 basicMatch fallback으로 동작할 수 있도록 exit 0을 반환합니다.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('\n=== OpenCV Build Script ===\n');

/**
 * OpenCV 모듈 로딩 테스트
 */
function testOpenCVLoad() {
    try {
        const cv = require('@u4/opencv4nodejs');
        console.log('✅ OpenCV loaded successfully!');
        console.log(`   Version: ${cv.version}`);
        console.log(`   Build Info: ${JSON.stringify(cv.getBuildInformation(), null, 2)}`);
        return true;
    } catch (error) {
        console.log('❌ OpenCV load failed:', error.message);
        return false;
    }
}

/**
 * npm rebuild 실행
 */
function rebuildOpenCV() {
    return new Promise((resolve, reject) => {
        console.log('📦 Running: npm rebuild @u4/opencv4nodejs\n');

        const child = spawn('npm', ['rebuild', '@u4/opencv4nodejs'], {
            stdio: 'inherit',
            shell: true,
            cwd: path.join(__dirname, '..')
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('\n✅ npm rebuild completed successfully');
                resolve(true);
            } else {
                console.log(`\n⚠️  npm rebuild exited with code ${code}`);
                resolve(false);
            }
        });

        child.on('error', (err) => {
            console.error('\n❌ Failed to start npm rebuild:', err.message);
            resolve(false);
        });
    });
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('Step 1: Testing current OpenCV installation...\n');

    if (testOpenCVLoad()) {
        console.log('\n🎉 OpenCV is already built and working!\n');
        process.exit(0);
        return;
    }

    console.log('\nStep 2: Attempting to rebuild OpenCV...\n');

    const rebuildSuccess = await rebuildOpenCV();

    if (!rebuildSuccess) {
        console.log('\n⚠️  WARNING: OpenCV build failed');
        console.log('   App will use basicMatch fallback (~30% accuracy)');
        console.log('   To retry manually, run: npm run build:opencv\n');
        process.exit(0); // Exit 0 to allow installation to continue
        return;
    }

    console.log('\nStep 3: Validating rebuilt OpenCV...\n');

    if (testOpenCVLoad()) {
        console.log('\n🎉 OpenCV build and validation successful!\n');
        console.log('   Image matching will use OpenCV (~95% accuracy)\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  WARNING: OpenCV built but failed to load');
        console.log('   App will use basicMatch fallback (~30% accuracy)');
        console.log('   This may be due to missing system dependencies');
        console.log('   Check: https://github.com/UrielCh/opencv4nodejs#readme\n');
        process.exit(0); // Exit 0 to allow installation to continue
    }
}

// Run main function
main().catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    console.log('   App will use basicMatch fallback\n');
    process.exit(0); // Exit 0 to allow installation to continue
});
