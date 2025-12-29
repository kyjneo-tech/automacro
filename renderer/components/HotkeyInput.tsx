import React, { useState } from 'react';
import { X } from 'lucide-react';

interface HotkeyInputProps {
  value: string;
  onChange: (hotkey: string) => void;
  placeholder?: string;
}

export const HotkeyInput: React.FC<HotkeyInputProps> = ({ value, onChange, placeholder }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [tempKeys, setTempKeys] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];

    // Modifier keys
    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // Main key
    const mainKey = e.key.toUpperCase();

    // F1-F12 처리
    if (mainKey.startsWith('F') && mainKey.length <= 3) {
      keys.push(mainKey);
    }
    // 일반 키 (A-Z, 0-9 등)
    else if (mainKey.length === 1 && /[A-Z0-9]/.test(mainKey)) {
      keys.push(mainKey);
    }
    // 특수 키
    else if (['ESCAPE', 'ENTER', 'SPACE', 'TAB', 'BACKSPACE'].includes(mainKey)) {
      keys.push(mainKey.charAt(0) + mainKey.slice(1).toLowerCase());
    }

    if (keys.length > 0) {
      setTempKeys(keys);
    }
  };

  const handleKeyUp = () => {
    if (!isRecording || tempKeys.length === 0) return;

    const hotkey = tempKeys.join('+');
    onChange(hotkey);
    setIsRecording(false);
    setTempKeys([]);
  };

  const handleBlur = () => {
    setIsRecording(false);
    setTempKeys([]);
  };

  const handleClear = () => {
    onChange('');
    setTempKeys([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={isRecording ? tempKeys.join('+') : value}
        placeholder={placeholder || '클릭하고 키를 누르세요'}
        onFocus={() => setIsRecording(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        readOnly
        className={`w-full px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-black text-slate-600 text-center cursor-pointer transition ${
          isRecording ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
        }`}
      />
      {value && !isRecording && (
        <button
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded"
        >
          <X size={12} className="text-slate-400" />
        </button>
      )}
      {isRecording && (
        <div className="absolute -bottom-6 left-0 text-[9px] text-indigo-600 font-bold">
          키 조합을 누르세요...
        </div>
      )}
    </div>
  );
};
