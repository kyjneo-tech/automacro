import { screen as nutScreen, imageResource } from "@nut-tree-fork/nut-js";
import { app } from 'electron';
import Tesseract from 'tesseract.js';
import screenshot from 'screenshot-desktop';
import { Jimp } from 'jimp';
import { displayHelper } from '../helpers/display-helper';
import path from 'path';
import fs from 'fs';

// nut-js 설정 최적화
const isProd = process.env.NODE_ENV === 'production';

/**
 * 프로젝트 루트 경로를 가져옵니다.
 * 빌드 후에는 app.asar 외부의 resourcesPath를, 개발 중에는 프로젝트 루트를 반환합니다.
 */
function getProjectRoot() {
    if (isProd) {
        return process.resourcesPath;
    }
    // 개발 환경에서는 package.json이 있는 곳을 기준으로 합니다.
    return path.join(app.getAppPath(), '..');
}

const projectRoot = getProjectRoot();
nutScreen.config.resourceDirectory = projectRoot;

// 캡처 캐시 변수
let lastScreenshot: Jimp | null = null;
let lastCaptureTime = 0;
const CACHE_DURATION = 250;

async function getScreenshot(): Promise<Jimp> {
    const now = Date.now();
    if (lastScreenshot && (now - lastCaptureTime < CACHE_DURATION)) {
        return lastScreenshot;
    }
    const imgBuffer = await screenshot({ format: 'png' });
    lastScreenshot = await Jimp.read(imgBuffer);
    lastCaptureTime = now;
    return lastScreenshot;
}

export const vision = {
  async getPixelColor(x: number, y: number): Promise<string> {
    try {
      const pixelCoords = displayHelper.screenToPixel(x, y);
      const image = await getScreenshot();

      if (pixelCoords.x < 0 || pixelCoords.y < 0 ||
          pixelCoords.x >= image.bitmap.width || pixelCoords.y >= image.bitmap.height) {
        return '#000000';
      }

      const hex = image.getPixelColor(pixelCoords.x, pixelCoords.y).toString(16).substring(0, 6).toUpperCase();
      return `#${hex.padStart(6, '0')}`;
    } catch (error) {
      console.error("[Vision] getPixelColor failed:", error);
      return '#000000';
    }
  },

  /**
   * 이미지 찾기 (절대 경로 및 한글 경로 대응)
   */
  async findImage(imagePath: string, confidence = 0.9, retries = 3, retryInterval = 500) {
    // 1. 경로 정규화 (절대 경로라면 그대로 사용, 상대 경로라면 resourceDirectory 기준)
    let fullPath = imagePath;
    if (!path.isAbsolute(imagePath)) {
        fullPath = path.resolve(nutScreen.config.resourceDirectory, imagePath);
    }

    // 2. 파일 존재 여부 먼저 확인 (디버깅 용이성)
    if (!fs.existsSync(fullPath)) {
        console.error(`[Vision] Image file not found: ${fullPath}`);
        return { success: false, error: `파일을 찾을 수 없습니다: ${fullPath}` };
    }

    console.log(`[Vision] Searching for: ${fullPath} (Confidence: ${confidence})`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // nut-js의 imageResource는 내부적으로 path.join을 사용하므로 
        // 이미 절대 경로인 경우를 위해 인스턴스를 직접 생성하거나 경로를 조정합니다.
        const img = await imageResource(fullPath);
        const region = await nutScreen.find(img, { confidence });
        
        return {
            success: true,
            x: Math.round(region.left + region.width / 2),
            y: Math.round(region.top + region.height / 2),
            region
        };
      } catch (error) {
        if (attempt === retries) break;
        await new Promise(r => setTimeout(r, retryInterval));
      }
    }
    return { success: false, error: '화면에서 이미지를 찾을 수 없습니다.' };
  },

  async readText(x?: number, y?: number, width?: number, height?: number, lang = 'kor+eng') {
      try {
          let image = await getScreenshot();
          
          if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
              const pixelCoords = displayHelper.screenToPixel(x, y);
              const pixelWidth = Math.round(width * pixelCoords.scaleFactor);
              const pixelHeight = Math.round(height * pixelCoords.scaleFactor);
              
              const cropX = Math.max(0, pixelCoords.x);
              const cropY = Math.max(0, pixelCoords.y);
              const cropW = Math.min(pixelWidth, image.bitmap.width - cropX);
              const cropH = Math.min(pixelHeight, image.bitmap.height - cropY);
              
              image = image.clone().crop({ x: cropX, y: cropY, w: cropW, h: cropH });
          }

          const base64Image = await image.getBase64Async('image/png');
          const { data: { text } } = await Tesseract.recognize(base64Image, lang);
          
          return { success: true, text: text.trim() };
      } catch (error) {
          console.error("[Vision] readText failed:", error);
          return { success: false, text: '', error: String(error) };
      }
  }
};
