import React, { useState } from 'react';
import { 
    MousePointer2, Keyboard, GitBranch, ChevronDown, ChevronRight, 
    MousePointerClick, Move, ArrowDownUp, Type, KeyboardIcon, Clock,
    Zap, Target, Palette, Box, Activity
} from 'lucide-react';
import { translations, Language } from '../utils/translations';

interface SidebarProps {
    lang: Language;
    onAddBlock: (cat: any, type: string, targetType?: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ lang, onAddBlock }) => {
    const t = translations[lang];
    const [openCat, setOpenCat] = useState<string | null>('mouse');

    const toggleCat = (cat: string) => setOpenCat(openCat === cat ? null : cat);

    return (
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                
                {/* 1. MOUSE */}
                <div className="space-y-1">
                    <button onClick={() => toggleCat('mouse')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3 font-bold text-slate-700"><MousePointer2 className="text-blue-600" size={18}/> <span className="text-sm">{t.cat_mouse}</span></div>
                        {openCat === 'mouse' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {openCat === 'mouse' && (
                        <div className="pl-4 space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                            <SubToolButton icon={<Target size={14}/>} label={t.tool_click} onClick={() => onAddBlock('mouse', 'click', 'coordinate')} />
                            <SubToolButton icon={<Zap size={14}/>} label={t.tool_repeat} onClick={() => onAddBlock('mouse', 'repeat-click')} />
                            <SubToolButton icon={<Move size={14}/>} label={t.tool_drag} onClick={() => onAddBlock('mouse', 'drag')} />
                            <SubToolButton icon={<ArrowDownUp size={14}/>} label={t.tool_scroll} onClick={() => onAddBlock('mouse', 'scroll')} />
                        </div>
                    )}
                </div>

                {/* 2. KEYBOARD */}
                <div className="space-y-1">
                    <button onClick={() => toggleCat('keyboard')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3 font-bold text-slate-700"><KeyboardIcon className="text-pink-600" size={18}/> <span className="text-sm">{t.cat_keyboard}</span></div>
                        {openCat === 'keyboard' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {openCat === 'keyboard' && (
                        <div className="pl-4 space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                            <SubToolButton icon={<Type size={14}/>} label={t.tool_text} onClick={() => onAddBlock('keyboard', 'text')} />
                            <SubToolButton icon={<Keyboard size={14}/>} label={t.tool_shortcut} onClick={() => onAddBlock('keyboard', 'shortcut')} />
                            <SubToolButton icon={<Activity size={14}/>} label={t.tool_key_adv} onClick={() => onAddBlock('keyboard', 'key-repeat')} />
                        </div>
                    )}
                </div>

                {/* 3. FLOW */}
                <div className="space-y-1">
                    <button onClick={() => toggleCat('flow')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3 font-bold text-slate-700"><GitBranch className="text-emerald-600" size={18}/> <span className="text-sm">{t.cat_flow}</span></div>
                        {openCat === 'flow' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {openCat === 'flow' && (
                        <div className="pl-4 space-y-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                            <SubToolButton icon={<Clock size={14}/>} label={t.tool_wait} onClick={() => onAddBlock('flow', 'delay')} />
                            <SubToolButton icon={<GitBranch size={14}/>} label={t.tool_if} onClick={() => onAddBlock('flow', 'condition-image')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SubToolButton = ({ icon, label, onClick }: any) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all border border-transparent hover:border-blue-100">{icon}{label}</button>
);