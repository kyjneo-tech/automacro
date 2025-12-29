import { automation } from './automation';
import { vision } from './vision'; // 하위 호환성
import { visionEngine } from './vision-v2';
import { ActionBlock } from '../types';

// 색상 차이 계산 (간단한 RGB 거리)
function getColorDistance(hex1: string, hex2: string): number {
    const r1 = parseInt(hex1.substring(1, 3), 16);
    const g1 = parseInt(hex1.substring(3, 5), 16);
    const b1 = parseInt(hex1.substring(5, 7), 16);
    const r2 = parseInt(hex2.substring(1, 3), 16);
    const g2 = parseInt(hex2.substring(3, 5), 16);
    const b2 = parseInt(hex2.substring(5, 7), 16);
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

export const player = {
  isStopping: false,
  maxColorTolerance: 50, // HSV 기반 색상 허용 범위 (Vision 2.0)

  async play(blocks: ActionBlock[], onProgress?: (blockId: string, status?: string, error?: string) => void) {
    this.isStopping = false;
    await this.executeBlocks(blocks, onProgress);
  },

  stop() { this.isStopping = true; },

  async executeBlocks(blocks: ActionBlock[], onProgress?: (blockId: string, status?: string, error?: string) => void) {
    const totalBlocks = blocks.length;
    let currentBlock = 0;

    for (const block of blocks) {
      currentBlock++;
      if (this.isStopping) return;

      console.log(`\n[Player] ========== Block ${currentBlock}/${totalBlocks} ==========`);
      console.log(`[Player] ID: ${block.id}`);
      console.log(`[Player] Type: ${block.type}`);
      console.log(`[Player] Description: ${block.description || 'N/A'}`);

      if (onProgress) onProgress(block.id, 'running');

      try {
        let conditionMet = true;
        let skipReason = '';
        let cachedImageX: number | undefined;
        let cachedImageY: number | undefined;

        // 1. 색상 조건 검사 (HSV 기반, Vision 2.0)
        if (block.payload.color) {
            const result = await visionEngine.matchColor(
                block.payload.x || 0,
                block.payload.y || 0,
                block.payload.color,
                this.maxColorTolerance
            );

            if (!result.success) {
                skipReason = `색상 불일치 (현재: ${result.color})`;
                conditionMet = false;
            }
        }

        // 2. 이미지 조건 검사 (멀티스케일 + 멀티모니터, Vision 2.0)
        if (conditionMet && block.payload.path) {
            const confidence = block.payload.confidence || 0.75; // 더 관대한 기본값
            const imgResult = await visionEngine.findImage(block.payload.path, {
                confidence,
                searchAllMonitors: true,
                retries: 2,
                retryInterval: 300
            });
            if (!imgResult.success) {
                skipReason = imgResult.error || '이미지 없음';
                conditionMet = false;
            } else {
                // ✅ 조건 검사에서 찾은 이미지 위치 캐싱 (중복 검색 방지)
                cachedImageX = imgResult.x;
                cachedImageY = imgResult.y;
                console.log(`[Player] Image cached from condition check at (${cachedImageX}, ${cachedImageY})`);
            }
        }

        if (!conditionMet) {
            if (onProgress) onProgress(block.id, 'skipped', skipReason);
            continue;
        }

        // --- 실행 로직 ---
        // 이미지가 있는 경우 캐싱된 위치 또는 실시간 검색
        let targetX = block.payload.x;
        let targetY = block.payload.y;

        if (block.payload.path && !conditionMet) {
            // 이미지 조건 검사에서 실패했으면 이미 건너뜀
        } else if (block.payload.path) {
            // ✅ 캐싱된 좌표가 있으면 재사용 (중복 검색 방지)
            if (cachedImageX !== undefined && cachedImageY !== undefined) {
                targetX = cachedImageX;
                targetY = cachedImageY;
                console.log(`[Player] Using cached image position (${targetX}, ${targetY}) - duplicate search avoided ⚡`);
            } else {
                // 캐싱된 좌표가 없으면 새로 검색
                const imgResult = await visionEngine.findImage(block.payload.path, {
                    confidence: block.payload.confidence || 0.75,
                    searchAllMonitors: true,
                    retries: 1,
                    retryInterval: 100
                });

                if (imgResult.success && imgResult.x !== undefined && imgResult.y !== undefined) {
                    targetX = imgResult.x;
                    targetY = imgResult.y;
                    console.log(`[Player] Image found at (${targetX}, ${targetY}), using this position`);
                } else {
                    // 이미지를 못 찾으면 블록 실패 처리
                    if (onProgress) onProgress(block.id, 'failed', '이미지를 찾을 수 없습니다');
                    continue;
                }
            }
        }

        switch (block.type) {
            case 'click':
                await automation.moveMouse(targetX, targetY);
                await automation.clickMouse(block.payload.button || 'left');
                break;
            case 'dblclick':
                await automation.moveMouse(targetX, targetY);
                await automation.clickMouse('double');
                break;
            case 'repeat-click':
                await automation.moveMouse(targetX || 0, targetY || 0);
                await automation.repeatClick(block.payload.button || 'left', block.payload.count || 10, block.payload.interval || 50);
                break;
            case 'drag':
                await automation.dragMouse(block.payload.startX, block.payload.startY, block.payload.endX, block.payload.endY);
                break;
            case 'scroll':
                await automation.scrollMouse(block.payload.amount);
                break;
            case 'type':
                await automation.typeText(block.payload.text);
                break;
            case 'shortcut':
                if (block.payload.keys) await automation.pressShortcut(block.payload.keys);
                break;
            case 'delay':
                await new Promise(r => setTimeout(r, Math.max(block.payload.ms, 10)));
                break;
            case 'condition-image':
                const result = await visionEngine.findImage(block.payload.path, {
                    confidence: block.payload.confidence || 0.75,
                    searchAllMonitors: true
                });
                if (result.success && block.children) await this.executeBlocks(block.children, onProgress);
                else if (!result.success && block.elseChildren) await this.executeBlocks(block.elseChildren, onProgress);
                break;
        }

        console.log(`[Player] ✅ Block ${currentBlock}/${totalBlocks} completed successfully\n`);
        if (onProgress) onProgress(block.id, 'completed');
      } catch (error) {
        console.error(`[Player] ❌ Block ${currentBlock}/${totalBlocks} failed:`, error);
        if (onProgress) onProgress(block.id, 'failed', String(error));
      }
    }

    console.log(`\n[Player] ========== All blocks completed (${totalBlocks}/${totalBlocks}) ==========\n`);
  }
};
