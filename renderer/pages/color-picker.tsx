import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function ColorPickerPage() {
  const [color, setColor] = useState('#FFFFFF');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  // 🔥 useRef 사용: 최신 좌표를 항상 유지하되 리렌더링 방지
  const screenPosRef = useRef({ x: 0, y: 0 });

  // body 배경 투명 처리 (Tailwind base 스타일 override)
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc) return;

    console.log('[Renderer] Color Picker 마운트됨! 이벤트 리스너 등록 시작...');

    // 마우스 이동 시 좌표 전송 -> 메인에서 색상 조회 -> 응답
    const handleMouseMove = (e: MouseEvent) => {
        // 🔍 디버깅: 이벤트 발생 확인
        console.log(`[Renderer] MouseMove: client(${e.clientX}, ${e.clientY}), screen(${e.screenX}, ${e.screenY})`);

        setPos({ x: e.clientX, y: e.clientY });
        // 🔥 ref에 최신 좌표 저장 (리렌더링 없음)
        screenPosRef.current = { x: e.screenX, y: e.screenY };

        // 너무 잦은 요청 방지 (Throttle)
        requestAnimationFrame(() => {
            if (window.ipc) {
                // screenX, screenY: 화면 절대 좌표 사용
                window.ipc.send('color:get-at', { x: e.screenX, y: e.screenY });
            }
        });
    };

    const handleClick = (e: MouseEvent) => {
        if (window.ipc) {
            // 🔥 중요: 클릭 순간의 정확한 좌표 사용!
            const finalX = e.screenX;
            const finalY = e.screenY;
            console.log(`[Renderer] 클릭! Screen 좌표: (${finalX}, ${finalY}), 현재 색상: ${color}`);
            window.ipc.send('color:selected', { color, x: finalX, y: finalY });
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && window.ipc) {
            window.ipc.send('color:cancel');
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    console.log('[Renderer] ✓ 이벤트 리스너 등록 완료! (mousemove, click, keydown)');

    // 메인 프로세스에서 색상 정보 수신
    const unsubscribe = window.ipc.on('color:update', (hex: string) => {
        setColor(hex);
    });

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('click', handleClick);
        window.removeEventListener('keydown', handleKeyDown);
        if (unsubscribe) unsubscribe();
    };
  }, [color]); // 🔥 screenPos 제거: ref 사용으로 불필요

  return (
    <React.Fragment>
      <Head>
        <title>Color Picker</title>
        <style>{`
          html, body {
            background: transparent !important;
            overflow: hidden;
          }
        `}</style>
      </Head>
      <div className="w-screen h-screen cursor-crosshair relative" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', minWidth: '100vw', minHeight: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* 안내 메시지 */}
        <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
          <div className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-2xl border-2 border-white">
            클릭하여 색상을 선택하세요
            <br/>
            <span className="text-sm font-normal">ESC를 누르면 취소됩니다</span>
          </div>
        </div>

        {/* 툴팁 (마우스 옆) */}
        <div
            className="fixed pointer-events-none flex items-center gap-3 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-2xl border-2 border-white z-50 transition-transform duration-75"
            style={{
                left: pos.x + 25,
                top: pos.y + 25,
            }}
        >
            <div
                className="w-10 h-10 rounded-lg border-2 border-white shadow-lg"
                style={{ backgroundColor: color }}
            />
            <div className="flex flex-col">
                <span className="text-sm font-mono font-bold">{color}</span>
                <span className="text-xs text-slate-300">클릭하여 선택</span>
            </div>
        </div>
      </div>
    </React.Fragment>
  );
}
