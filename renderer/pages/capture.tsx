import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function CapturePage() {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && typeof window !== 'undefined' && window.ipc) {
        window.ipc.send('capture:cancel');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // 단순 클릭: 바로 좌표 전송하고 종료
    if (typeof window !== 'undefined' && window.ipc) {
      const x = e.clientX;
      const y = e.clientY;
      window.ipc.send('capture:complete', { x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 항상 현재 마우스 위치 업데이트
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    // 기존 로직 제거 (단순 클릭 방식으로 변경)
  };

  return (
    <React.Fragment>
      <Head>
        <title>좌표 선택</title>
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
          <div className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-2xl border-2 border-white">
            클릭하여 좌표를 선택하세요
            <br/>
            <span className="text-sm font-normal">ESC를 누르면 취소됩니다</span>
          </div>
        </div>

        {/* 마우스 커서 옆에 실시간 좌표 표시 */}
        <div
          className="absolute pointer-events-none bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg shadow-2xl font-mono font-bold border-2 border-white"
          style={{
            left: currentPos.x + 25,
            top: currentPos.y + 25,
            transform: 'translate(0, 0)',
            zIndex: 9999
          }}
        >
          X: {currentPos.x} | Y: {currentPos.y}
        </div>

        {/* 십자선 표시 */}
        <div className="absolute pointer-events-none" style={{ left: 0, top: currentPos.y, width: '100%', height: '2px', backgroundColor: 'rgba(99, 102, 241, 0.8)', zIndex: 9998 }} />
        <div className="absolute pointer-events-none" style={{ left: currentPos.x, top: 0, width: '2px', height: '100%', backgroundColor: 'rgba(99, 102, 241, 0.8)', zIndex: 9998 }} />

        {/* 중심점 표시 */}
        <div
          className="absolute pointer-events-none bg-red-500 rounded-full border-2 border-white shadow-lg"
          style={{
            left: currentPos.x - 6,
            top: currentPos.y - 6,
            width: '12px',
            height: '12px',
            zIndex: 10000
          }}
        />
      </div>
    </React.Fragment>
  );
}
