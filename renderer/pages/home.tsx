import React, { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import {
    Play, Square, Globe, Save, FolderOpen, MousePointer2, Settings,
    X, Target, ImageIcon, Palette, Box, Clock, Zap, Monitor, MapPin, Loader2
} from 'lucide-react';
import { translations, Language } from '../utils/translations';
import { ActionNode, ActionBlock } from '../components/ActionNode';
import { Sidebar } from '../components/Sidebar';
import { HotkeyInput } from '../components/HotkeyInput';

export default function HomePage() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('language') as Language) || 'ko';
    }
    return 'ko';
  });
  const t = translations[lang];

  const [actions, setActions] = useState<ActionBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ActionBlock | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState(0); // ✅ 진행률 추적

  // 설정 상태
  const [settings, setSettings] = useState({
    autoHide: true,
    panicKey: 'F12',
    recordStartKey: 'F9',
    recordStopKey: 'F10'
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // 언어 변경 시 localStorage에 저장
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLang);
    }
  };

  // 설정 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ipc) {
      window.ipc.invoke('settings:get').then((loadedSettings: any) => {
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
      });
    }
  }, []);

  // 설정 저장
  const handleSaveSettings = () => {
    if (typeof window !== 'undefined' && window.ipc) {
      window.ipc.invoke('settings:save', settings).then(() => {
        console.log('Settings saved successfully');
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ipc) {
        const handleRecorderAction = (block: any) => {
            const newBlock: ActionBlock = { ...block, category: 'record' };
            setActions(prev => [...prev, newBlock]);
            scrollToBottom();
        };
        const handleStartRequest = () => {
            setIsRecording(prev => {
                if (!prev) window.ipc.send('recorder:start');
                return true;
            });
        };
        const handleStopRequest = () => {
            setIsRecording(prev => {
                if (prev) window.ipc.invoke('recorder:stop');
                return false;
            });
        };
        const handlePlayerProgress = (data: { id: string, status: string, error?: string }) => {
            setActions(prev => updateStatus(prev, data.id, data.status, data.error));
            // ✅ 블록 완료 시 진행률 업데이트
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'skipped') {
                setCompletedBlocks(prev => prev + 1);
            }
        };
        const handlePlayerDone = () => {
            setIsRunning(false);
            setIsPlayerLoading(false);
            setCompletedBlocks(0); // ✅ 진행률 리셋
            setActions(prev => resetStatus(prev));
        };
        const handlePlayerLoading = (loading: boolean) => {
            setIsPlayerLoading(loading);
        };

        window.ipc.on('recorder:on-action', handleRecorderAction);
        window.ipc.on('recorder:start-request', handleStartRequest);
        window.ipc.on('recorder:stop-request', handleStopRequest);
        window.ipc.on('player:progress', handlePlayerProgress);
        window.ipc.on('player:done', handlePlayerDone);
        window.ipc.on('player:loading', handlePlayerLoading);

        // Cleanup: 컴포넌트 언마운트 시 모든 리스너 제거
        return () => {
            window.ipc.off('recorder:on-action', handleRecorderAction);
            window.ipc.off('recorder:start-request', handleStartRequest);
            window.ipc.off('recorder:stop-request', handleStopRequest);
            window.ipc.off('player:progress', handlePlayerProgress);
            window.ipc.off('player:done', handlePlayerDone);
            window.ipc.off('player:loading', handlePlayerLoading);
        };
    }
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  const updateStatus = (blocks: ActionBlock[], id: string, status: any, error?: string): ActionBlock[] =>
    blocks.map(b => ({ ...b, status: b.id === id ? status : b.status, error: b.id === id ? error : b.error }));
  const resetStatus = (blocks: ActionBlock[]): ActionBlock[] => blocks.map(b => ({ ...b, status: undefined, error: undefined }));

  const scrollToBottom = () => { setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50); }

  const handleToggleRecord = async () => {
      if (isRecording) {
          // 녹화 중지 - recorder:on-action으로 이미 추가되었으므로 중복 추가 안함
          await window.ipc.invoke('recorder:stop');
          setIsRecording(false);
      } else {
          setIsRecording(true);
          window.ipc.send('recorder:start');
      }
  };

  // 블록 삭제 (메모이제이션으로 성능 최적화 + 디버깅 로그)
  const handleDeleteBlock = useCallback((id: string) => {
      console.log(`[삭제 시도] 블록 ID: ${id}`);
      setActions(prev => {
          const filtered = prev.filter(b => b.id !== id);
          console.log(`[삭제 결과] 이전: ${prev.length}개 → 이후: ${filtered.length}개`);
          return filtered;
      });
      // 삭제된 블록이 현재 선택된 블록이면 선택 해제
      setSelectedBlock(current => current?.id === id ? null : current);
  }, []);

  // 개별 속성 제거 함수들
  const removeProperty = useCallback((blockId: string, propertyKey: string) => {
      console.log(`[속성 제거] 블록 ID: ${blockId}, 속성: ${propertyKey}`);
      setActions(prev => prev.map(block => {
          if (block.id === blockId) {
              const newPayload = { ...block.payload };
              delete newPayload[propertyKey];

              const updated = { ...block, payload: newPayload };

              // 현재 선택된 블록도 함께 업데이트
              setSelectedBlock(current => current?.id === blockId ? updated : current);

              return updated;
          }
          return block;
      }));
  }, []);

  const handleAddBlock = (cat: any, type: string) => {
      // 타입별 기본 설정
      let payload: any = { x: 0, y: 0, button: 'left' };
      let description = '';

      switch (type) {
          case 'click':
              description = t.tool_click + ' (좌표 지정 필요)';
              break;
          case 'repeat-click':
              payload = { x: 0, y: 0, button: 'left', count: 10, interval: 50 };
              description = '10회 연타 (50ms 간격)';
              break;
          case 'drag':
              payload = { startX: 100, startY: 100, endX: 500, endY: 500 };
              description = '마우스 드래그 (100,100 → 500,500)';
              break;
          case 'scroll':
              payload = { amount: 100 };
              description = '스크롤 100px';
              break;
          case 'text':
              payload = { text: '여기에 입력할 텍스트를 작성하세요' };
              description = '텍스트 입력';
              break;
          case 'shortcut':
              payload = { keys: ['Control', 'C'] };
              description = 'Control+C 단축키';
              break;
          case 'key-repeat':
              payload = { keyName: 'Enter', count: 5, interval: 50 };
              description = 'Enter 키 5회 연타';
              break;
          case 'delay':
              payload = { ms: 1000 };
              description = '1초 대기';
              break;
          case 'condition-image':
              payload = { path: '', confidence: 0.9, children: [], elseChildren: [] };
              description = '이미지 조건 분기 (이미지 등록 필요)';
              break;
          default:
              description = type;
      }

      const block: ActionBlock = {
          id: `${type}-${Date.now()}`,
          category: cat,
          type: type,
          payload: payload,
          description: description
      };

      setActions(prev => [...prev, block]);
      setSelectedBlock(block);
      scrollToBottom();
  };

  // --- 개별 픽킹 로직 (복합 조합 가능) ---
  const pickTarget = async (mode: 'point' | 'image' | 'color') => {
      if (!selectedBlock) return;

      let result;
      if (mode === 'point') result = await window.ipc.invoke('pick:point');
      else if (mode === 'image') result = await window.ipc.invoke('pick:image');
      else if (mode === 'color') result = await window.ipc.invoke('pick:color');

      if (result) {
          // 이미지의 경우 좌표를 제거하고 path만 저장
          if (mode === 'image') {
              const updated = {
                  ...selectedBlock,
                  payload: { ...selectedBlock.payload, path: result.path }
              };
              setActions(prev => prev.map(b => b.id === selectedBlock.id ? updated : b));
              setSelectedBlock(updated);
          } else {
              const updated = {
                  ...selectedBlock,
                  payload: { ...selectedBlock.payload, ...result }
              };
              setActions(prev => prev.map(b => b.id === selectedBlock.id ? updated : b));
              setSelectedBlock(updated);
          }
      }
  };

  return (
    <React.Fragment>
      <Head><title>마이메이트 프로 v3</title></Head>
      <div className="h-screen bg-slate-100 flex flex-col text-slate-800 overflow-hidden font-sans">
        
        {/* 헤더 */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-30 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Monitor size={20}/></div>
                <div>
                    <h1 className="text-lg font-black tracking-tight leading-none">{t.app_title}</h1>
                    <span className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">{t.app_subtitle}</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={handleToggleRecord} className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-slate-200 text-red-500 hover:bg-red-50'}`}>
                    <Zap size={14}/> {isRecording ? t.recording : t.start_record}
                </button>

                {!isRunning ? (
                    <button
                        onClick={() => { setIsRunning(true); setCompletedBlocks(0); window.ipc.invoke('recorder:play', actions); }}
                        disabled={actions.length === 0 || isPlayerLoading}
                        className={`${isPlayerLoading ? 'bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:bg-slate-300 text-white font-bold py-2.5 px-8 rounded-full flex items-center gap-2 shadow-lg transition active:scale-95 text-sm`}
                    >
                        {isPlayerLoading ? (
                            <><Loader2 size={18} className="animate-spin" /> 준비중...</>
                        ) : (
                            <><Play size={18} fill="currentColor" /> {t.play}</>
                        )}
                    </button>
                 ) : (
                    <button onClick={() => window.ipc.send('player:stop')} className="bg-slate-800 text-white font-bold py-2.5 px-8 rounded-full flex items-center gap-2 shadow-lg transition text-sm"><Square size={18} fill="currentColor" /> {t.emergency_stop}</button>
                 )}

                 <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition"><Settings size={20}/></button>
            </div>
        </header>

        {/* ✅ 실행 진행률 바 */}
        {isRunning && (
            <div className="bg-indigo-600 px-6 py-3 flex items-center gap-3 shadow-md">
                <Loader2 size={16} className="animate-spin text-white" />
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-xs font-bold">실행 중... ({completedBlocks} / {actions.length})</span>
                        <span className="text-indigo-200 text-xs">{Math.round((completedBlocks / actions.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-indigo-800/50 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-white h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(completedBlocks / actions.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 flex overflow-hidden">
            <Sidebar lang={lang} onAddBlock={handleAddBlock} />

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 scroll-smooth" ref={scrollRef}>
                <div className="max-w-2xl mx-auto pl-8">
                    {actions.length === 0 ? (
                        <div className="text-center py-40 opacity-10"><Monitor size={100} className="mx-auto mb-4"/> <p className="text-2xl font-black">{t.start_work}</p></div>
                    ) : (
                        actions.map(block => (
                            <ActionNode key={block.id} block={block} lang={lang} selectedId={selectedBlock?.id} onSelect={setSelectedBlock} onDelete={handleDeleteBlock} renderChildren={(items) => items.map(i => <ActionNode key={i.id} block={i} lang={lang} onSelect={setSelectedBlock} onDelete={() => {}} />)} />
                        ))
                    )}
                </div>
            </div>

            {/* 우측 설정 패널 (복합 조합) */}
            <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.block_detail}</span>
                    {selectedBlock && <button onClick={() => setSelectedBlock(null)}><X size={16} className="text-slate-300 hover:text-slate-600 transition"/></button>}
                </div>

                {selectedBlock ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* 1. 타겟 지정 (중복 선택 가능) */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.recognition_conditions}</label>
                            <div className="grid grid-cols-1 gap-2">
                                <PropertyButton active={!!selectedBlock.payload.x} icon={<Target size={16}/>} label={t.target_coord} subLabel={selectedBlock.payload.x ? `${selectedBlock.payload.x}, ${selectedBlock.payload.y}` : t.target_coord_desc} onClick={() => pickTarget('point')} />
                                <PropertyButton active={!!selectedBlock.payload.path} icon={<ImageIcon size={16}/>} label={t.target_image} subLabel={selectedBlock.payload.path ? t.registered_image : t.target_image_desc} onClick={() => pickTarget('image')} />
                                <PropertyButton active={!!selectedBlock.payload.color} icon={<Palette size={16}/>} label={t.target_color} subLabel={selectedBlock.payload.color ? selectedBlock.payload.color : t.target_color_desc} onClick={() => pickTarget('color')} />
                            </div>

                            {/* 좌표 직접 입력 + 제거 버튼 */}
                            {selectedBlock.payload.x !== undefined && (
                                <div className="mt-2 p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[9px] font-bold text-blue-600 uppercase">📍 좌표 설정됨</label>
                                        <button
                                            onClick={() => { removeProperty(selectedBlock.id, 'x'); removeProperty(selectedBlock.id, 'y'); }}
                                            className="text-[9px] text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition"
                                        >
                                            ✕ 좌표 제거
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t.coord_x}</label>
                                            <input type="number" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.x} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, x: parseInt(e.target.value) || 0}} : b))} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">{t.coord_y}</label>
                                            <input type="number" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.y} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, y: parseInt(e.target.value) || 0}} : b))} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. 세부 값 수정 */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                             {(selectedBlock.type === 'text' || selectedBlock.type === 'type') && (
                                 <div>
                                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.input_text}</label>
                                     <textarea
                                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 focus:ring-2 focus:ring-indigo-500 transition outline-none"
                                         placeholder={t.input_placeholder}
                                         value={selectedBlock.payload.text || ''}
                                         onChange={(e) => {
                                             const newText = e.target.value;
                                             const updated = {
                                                 ...selectedBlock,
                                                 payload: { ...selectedBlock.payload, text: newText },
                                                 description: `"${newText.slice(0, 20)}${newText.length > 20 ? '...' : ''}" 입력`
                                             };
                                             setActions(prev => prev.map(b => b.id === selectedBlock.id ? updated : b));
                                             setSelectedBlock(updated);
                                         }}
                                     />
                                 </div>
                             )}

                             {selectedBlock.type === 'delay' && (
                                 <div>
                                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.wait_time}</label>
                                     <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.ms} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, ms: parseInt(e.target.value)}, description: `${e.target.value}ms 대기`} : b))} />
                                 </div>
                             )}

                             {selectedBlock.type === 'repeat-click' && (
                                 <div className="space-y-3">
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.button_type}</label>
                                         <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.button || 'left'} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, button: e.target.value}} : b))}>
                                             <option value="left">{t.button_left}</option>
                                             <option value="right">{t.button_right}</option>
                                         </select>
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.click_count}</label>
                                         <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.count || 10} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, count: parseInt(e.target.value)}, description: `${e.target.value}회 연타`} : b))} />
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.click_interval}</label>
                                         <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.interval || 50} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, interval: parseInt(e.target.value)}} : b))} />
                                     </div>
                                 </div>
                             )}

                             {selectedBlock.type === 'key-repeat' && (
                                 <div className="space-y-3">
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.repeat_key}</label>
                                         <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder={t.repeat_key_placeholder} value={selectedBlock.payload.keyName || ''} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, keyName: e.target.value}, description: `${e.target.value} 키 연타`} : b))} />
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.repeat_count}</label>
                                         <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.count || 5} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, count: parseInt(e.target.value)}} : b))} />
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.key_interval}</label>
                                         <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.interval || 50} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, interval: parseInt(e.target.value)}} : b))} />
                                     </div>
                                 </div>
                             )}

                             {selectedBlock.type === 'shortcut' && (
                                 <div>
                                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">단축키</label>
                                     <HotkeyInput
                                         value={selectedBlock.payload.keys ? selectedBlock.payload.keys.join('+') : ''}
                                         onChange={(keys) => {
                                             const keyArray = keys.split('+').filter(k => k);
                                             setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, keys: keyArray}, description: `${keys} 단축키`} : b));
                                         }}
                                         placeholder="예: CommandOrControl+C, Alt+F4"
                                     />
                                 </div>
                             )}

                             {selectedBlock.type === 'drag' && (
                                 <div className="space-y-3">
                                     <div className="grid grid-cols-2 gap-2">
                                         <div>
                                             <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">시작 X</label>
                                             <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.startX || 0} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, startX: parseInt(e.target.value) || 0}} : b))} />
                                         </div>
                                         <div>
                                             <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">시작 Y</label>
                                             <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.startY || 0} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, startY: parseInt(e.target.value) || 0}} : b))} />
                                         </div>
                                     </div>
                                     <div className="grid grid-cols-2 gap-2">
                                         <div>
                                             <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">끝 X</label>
                                             <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.endX || 0} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, endX: parseInt(e.target.value) || 0}} : b))} />
                                         </div>
                                         <div>
                                             <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">끝 Y</label>
                                             <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" value={selectedBlock.payload.endY || 0} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, endY: parseInt(e.target.value) || 0}} : b))} />
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {selectedBlock.type === 'scroll' && (
                                 <div>
                                     <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">스크롤 양 (음수: 아래, 양수: 위)</label>
                                     <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={selectedBlock.payload.amount || 100} onChange={(e) => setActions(prev => prev.map(b => b.id === selectedBlock.id ? {...b, payload: {...b.payload, amount: parseInt(e.target.value)}, description: `${e.target.value} 스크롤`} : b))} />
                                 </div>
                             )}

                             {selectedBlock.payload.path && (
                                 <div className="space-y-3 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                                     <div className="flex justify-between items-center">
                                         <label className="text-[10px] font-black text-indigo-600 uppercase">🖼️ {t.registered_image}</label>
                                         <button
                                             onClick={() => { removeProperty(selectedBlock.id, 'path'); removeProperty(selectedBlock.id, 'confidence'); }}
                                             className="text-[9px] text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition"
                                         >
                                             ✕ 이미지 제거
                                         </button>
                                     </div>
                                     <div className="rounded-xl border border-indigo-200 overflow-hidden bg-white flex items-center justify-center p-2 min-h-[100px]">
                                         <img src={`file://${selectedBlock.payload.path}`} className="max-w-full max-h-40 object-contain shadow-sm" />
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.confidence} ({((selectedBlock.payload.confidence || 0.9) * 100).toFixed(0)}%)</label>
                                         <input
                                            type="range"
                                            min="50"
                                            max="100"
                                            step="5"
                                            className="w-full"
                                            value={(selectedBlock.payload.confidence || 0.9) * 100}
                                            onChange={(e) => {
                                                const newConfidence = parseInt(e.target.value) / 100;
                                                const updated = {
                                                    ...selectedBlock,
                                                    payload: { ...selectedBlock.payload, confidence: newConfidence }
                                                };
                                                setActions(prev => prev.map(b => b.id === selectedBlock.id ? updated : b));
                                                setSelectedBlock(updated); // ✅ 상태 동기화
                                            }}
                                        />
                                         <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                             <span>{t.confidence_low}</span>
                                             <span>{t.confidence_high}</span>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {selectedBlock.payload.color && (
                                 <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl">
                                     <div className="flex justify-between items-center mb-2">
                                         <label className="text-[10px] font-black text-purple-600 uppercase">🎨 색상 설정됨</label>
                                         <button
                                             onClick={() => removeProperty(selectedBlock.id, 'color')}
                                             className="text-[9px] text-red-500 hover:text-red-700 font-bold px-2 py-1 hover:bg-red-50 rounded transition"
                                         >
                                             ✕ 색상 제거
                                         </button>
                                     </div>
                                     <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-purple-200">
                                         <div className="w-12 h-12 rounded-lg border-2 border-purple-300 shadow-sm" style={{ backgroundColor: selectedBlock.payload.color }} />
                                         <div className="flex-1">
                                             <div className="text-xs font-bold text-slate-700">{selectedBlock.payload.color}</div>
                                             <div className="text-[10px] text-slate-400">이 색상이 감지되면 실행</div>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {selectedBlock.type === 'condition-image' && (
                                 <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                     <div className="text-xs font-bold text-emerald-700 mb-2">{t.if_block_title}</div>
                                     <p className="text-[11px] text-emerald-600 leading-relaxed">{t.if_block_desc}</p>
                                 </div>
                             )}
                        </div>

                        <button
                            onClick={() => handleDeleteBlock(selectedBlock.id)}
                            className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition mt-10"
                        >
                            🗑️ {t.delete_block}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-20">
                        <Settings size={60} className="mb-4 text-slate-300" /><p className="text-sm font-bold">{t.select_block}</p>
                    </div>
                )}
            </div>
        </div>

        {/* 설정 모달 */}
        {showSettings && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="font-black text-slate-800 flex items-center gap-2 text-lg">{t.settings_title}</h2>
                        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white rounded-full transition"><X size={20}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        {/* 언어 설정 */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">{t.language}</span>
                                <select className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600" value={lang} onChange={(e) => handleLanguageChange(e.target.value as Language)}>
                                    <option value="ko">{t.language_ko}</option>
                                    <option value="en">{t.language_en}</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">{t.auto_hide}</span>
                                <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={settings.autoHide} onChange={(e) => setSettings({...settings, autoHide: e.target.checked})} />
                            </div>
                        </div>

                        {/* 단축키 설정 */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">{t.hotkey_settings}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">{t.panic_key}</label>
                                    <HotkeyInput
                                        value={settings.panicKey}
                                        onChange={(key) => setSettings({...settings, panicKey: key})}
                                        placeholder="예: F12, CommandOrControl+Shift+Q"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">{t.record_start_key}</label>
                                    <HotkeyInput
                                        value={settings.recordStartKey}
                                        onChange={(key) => setSettings({...settings, recordStartKey: key})}
                                        placeholder="예: F9, CommandOrControl+R"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">{t.record_stop_key}</label>
                                    <HotkeyInput
                                        value={settings.recordStopKey}
                                        onChange={(key) => setSettings({...settings, recordStopKey: key})}
                                        placeholder="예: F10, CommandOrControl+S"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition"
                            >
                                {t.save_hotkeys}
                            </button>
                        </div>

                        {/* 프로젝트 관리 */}
                        <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-100">
                            <button onClick={() => window.ipc.invoke('project:load').then(res => res && setActions(res))} className="py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition"><FolderOpen size={18}/> {t.load_file}</button>
                            <button onClick={() => window.ipc.invoke('project:save', actions)} className="py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-200"><Save size={18}/> {t.save_file}</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </React.Fragment>
  )
}

const PropertyButton = ({ active, icon, label, subLabel, onClick }: any) => (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl border-2 text-left transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'}`}>
        <div className={`p-2 rounded-xl ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{icon}</div>
        <div>
            <div className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-white/70' : 'text-slate-400'}`}>{label}</div>
            <div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>{subLabel}</div>
        </div>
    </button>
);
