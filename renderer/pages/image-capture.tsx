import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function ImageCapturePage() {
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // body 배경 투명 처리 (Tailwind base 스타일 override)
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  // ESC 키로 취소
  useEffect(() => {
    console.log('[Renderer] Image Capture 마운트됨!');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && typeof window !== 'undefined' && window.ipc) {
        window.ipc.send('capture:cancel');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    console.log('[Renderer] ✓ keydown 이벤트 리스너 등록 완료!');

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    console.log(`[Renderer] MouseDown: (${x}, ${y}), screen: (${e.screenX}, ${e.screenY})`);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (!startPos || !isDragging || typeof window === 'undefined' || !window.ipc) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // 최소 크기 체크 (5x5 픽셀)
    if (width >= 5 && height >= 5) {
      window.ipc.send('capture:complete', { x, y, width, height });
    } else {
      // 너무 작으면 취소
      setIsDragging(false);
      setStartPos(null);
    }
  };

  // 드래그 영역 계산
  const getDragRect = () => {
    if (!startPos || !isDragging) return null;
    return {
      left: Math.min(startPos.x, currentPos.x),
      top: Math.min(startPos.y, currentPos.y),
      width: Math.abs(currentPos.x - startPos.x),
      height: Math.abs(currentPos.y - startPos.y)
    };
  };

  const dragRect = getDragRect();

  return (
    <React.Fragment>
      <Head>
        <title>이미지 캡처</title>
        <style>{`
          html, body {
            background: transparent !important;
            overflow: hidden;
          }
        `}</style>
      </Head>
      <div
        className="w-screen h-screen cursor-crosshair relative select-none"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
          <div className="inline-block bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-2xl border-2 border-white">
            드래그하여 영역을 선택하세요
            <br/>
            <span className="text-sm font-normal">ESC를 누르면 취소됩니다</span>
          </div>
        </div>

        {/* 십자선 */}
        {!isDragging && (
          <>
            <div className="absolute pointer-events-none" style={{ left: 0, top: currentPos.y, width: '100%', height: '2px', backgroundColor: 'rgba(16, 185, 129, 0.8)', zIndex: 9998 }} />
            <div className="absolute pointer-events-none" style={{ left: currentPos.x, top: 0, width: '2px', height: '100%', backgroundColor: 'rgba(16, 185, 129, 0.8)', zIndex: 9998 }} />
          </>
        )}

        {/* 드래그 영역 표시 */}
        {dragRect && isDragging && (
          <>
            {/* 선택 영역 하이라이트 */}
            <div
              className="absolute pointer-events-none border-4 border-emerald-500 bg-emerald-500/10"
              style={{
                left: dragRect.left,
                top: dragRect.top,
                width: dragRect.width,
                height: dragRect.height,
                zIndex: 9999
              }}
            />
            {/* 크기 정보 표시 */}
            <div
              className="absolute pointer-events-none bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-2xl font-mono font-bold border-2 border-white"
              style={{
                left: dragRect.left + dragRect.width + 10,
                top: dragRect.top,
                zIndex: 10000
              }}
            >
              {dragRect.width} × {dragRect.height}
            </div>
          </>
        )}

        {/* 마우스 커서 위치 표시 (드래그 중이 아닐 때) */}
        {!isDragging && (
          <div
            className="absolute pointer-events-none bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-2xl font-mono font-bold border-2 border-white"
            style={{
              left: currentPos.x + 25,
              top: currentPos.y + 25,
              zIndex: 9999
            }}
          >
            X: {currentPos.x} | Y: {currentPos.y}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
