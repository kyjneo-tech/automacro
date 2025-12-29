import React from 'react';
import { 
    MousePointer2, Keyboard, Type, Image as ImageIcon, Palette, Clock, 
    Trash2, Loader2, Zap, ArrowDownUp, Crosshair, MapPin
} from 'lucide-react';
import { translations, Language } from '../utils/translations';

export interface ActionBlock {
  id: string;
  category: 'mouse' | 'keyboard' | 'flow' | 'record';
  type: string;
  payload: any;
  description: string;
  status?: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  error?: string;
  children?: ActionBlock[];
  elseChildren?: ActionBlock[];
}

interface ActionNodeProps {
  block: ActionBlock;
  lang: Language;
  selectedId?: string;
  onSelect: (block: ActionBlock) => void;
  onDelete: (id: string) => void;
  renderChildren?: (blocks: ActionBlock[]) => React.ReactNode;
}

export const ActionNode: React.FC<ActionNodeProps> = ({ 
    block, lang, selectedId, onSelect, onDelete, renderChildren 
}) => {
    const t = translations[lang];

    const getIcon = () => {
        if (block.category === 'record') return <Zap size={16} className="text-red-500 animate-pulse" />;
        switch (block.type) {
            case 'click': case 'repeat-click': return <MousePointer2 size={16} className="text-blue-500"/>;
            case 'text': case 'type': return <Type size={16} className="text-purple-500"/>;
            case 'delay': return <Clock size={16} className="text-slate-500"/>;
            case 'condition-image': return <GitBranchIcon size={16} className="text-emerald-500"/>;
            default: return <Zap size={16} />;
        }
    };

    return (
        <div className="relative group">
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200 -z-10 group-last:hidden" />
            
            <div className="flex items-start gap-3 mb-4">
                {/* 왼쪽 아이콘 */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 shadow-sm border-2 transition-all ${
                    block.status === 'running' ? 'bg-blue-50 border-blue-400 scale-110' :
                    block.status === 'failed' ? 'bg-red-50 border-red-400' :
                    block.status === 'skipped' ? 'bg-yellow-50 border-yellow-400' :
                    block.status === 'completed' ? 'bg-green-50 border-green-400' :
                    'bg-white border-slate-100'
                }`}>
                    {block.status === 'running' ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : getIcon()}
                </div>

                {/* 본문 카드 */}
                <div className="flex-1">
                    <div
                        onClick={() => onSelect(block)}
                        className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
                            selectedId === block.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' :
                            block.status === 'failed' ? 'bg-red-50 border-red-200' :
                            block.status === 'skipped' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-white border-slate-200 hover:border-blue-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">{block.description}</h4>
                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{block.type}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* 상세 정보 노출 (사용자가 한 눈에 알 수 있도록) */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {block.payload.x !== undefined && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                    <MapPin size={10} /> {block.payload.x}, {block.payload.y}
                                </span>
                            )}
                            {block.payload.color && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: block.payload.color }} />
                                    {block.payload.color}
                                </span>
                            )}
                            {block.payload.path && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                    <ImageIcon size={10} /> 이미지 포함
                                </span>
                            )}
                            {block.payload.text && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold truncate max-w-[150px]">
                                    <Type size={10} /> "{block.payload.text}"
                                </span>
                            )}
                            {block.payload.ms && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                                    <Clock size={10} /> {block.payload.ms}ms
                                </span>
                            )}
                        </div>

                        {/* 에러 또는 건너뛰기 메시지 표시 */}
                        {block.error && (block.status === 'failed' || block.status === 'skipped') && (
                            <div className={`mt-3 p-2 rounded-lg text-xs ${
                                block.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                <span className="font-bold">{block.status === 'failed' ? t.status_failed : t.status_skipped}</span> {block.error}
                            </div>
                        )}
                    </div>

                    {/* IF 분기 (재귀) */}
                    {block.type === 'condition-image' && renderChildren && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 border-dashed">
                                <div className="text-[9px] font-black text-emerald-600 mb-2 tracking-widest">{t.branch_true}</div>
                                {renderChildren(block.children || [])}
                            </div>
                            <div className="bg-red-50/30 rounded-xl p-3 border border-red-100 border-dashed">
                                <div className="text-[9px] font-black text-red-500 mb-2 tracking-widest">{t.branch_false}</div>
                                {renderChildren(block.elseChildren || [])}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const GitBranchIcon = ({ className, size }: any) => (
    <div className={className}><Crosshair size={size}/></div>
);
