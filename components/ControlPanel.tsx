
import React from 'react';
import { Difficulty } from '../types';

interface ControlPanelProps {
  onNewTask: (diff: Difficulty) => void;
  onCheck: () => void;
  onReset: () => void;
  onTeach: () => void;
  isTeaching: boolean;
  hasQuestion: boolean;
  isLoading?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onNewTask, onCheck, onReset, onTeach, isTeaching, hasQuestion, isLoading 
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* 難度選擇區 */}
      <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-sm font-bold text-stone-400 mb-4 text-center uppercase tracking-widest">選擇難度</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: Difficulty.UNIT, label: '個位數', color: 'bg-sky-500 hover:bg-sky-600' },
            { id: Difficulty.TENS, label: '十位數', color: 'bg-sky-500 hover:bg-sky-600' },
            { id: Difficulty.HUNDREDS, label: '百位數', color: 'bg-sky-500 hover:bg-sky-600' },
            { id: Difficulty.THOUSANDS, label: '千位數', color: 'bg-sky-500 hover:bg-sky-600' },
            { id: Difficulty.MIXED, label: '隨機挑戰', color: 'bg-rose-500 hover:bg-rose-600' },
          ].map((btn) => (
            <button 
              key={btn.id}
              onClick={() => onNewTask(btn.id)}
              className={`${btn.color} text-white font-black py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 hover:shadow-lg text-sm sm:text-base`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 功能操作區 */}
      <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 px-4">
        <button 
          disabled={!hasQuestion || isTeaching || isLoading}
          onClick={onTeach}
          className="group relative flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 disabled:bg-stone-200 disabled:text-stone-400 hover:bg-orange-600 text-white font-black rounded-2xl shadow-[0_6px_0_rgb(194,120,3)] active:shadow-none active:translate-y-[6px] transition-all"
        >
          <span className="text-xl">▶️</span>
          <span>演示教學</span>
        </button>
        
        <button 
          disabled={!hasQuestion || isLoading}
          onClick={onCheck}
          className={`group relative flex-1 flex items-center justify-center gap-2 px-8 py-4 ${isLoading ? 'bg-emerald-300' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:bg-stone-200 disabled:text-stone-400 text-white font-black rounded-2xl shadow-[0_6px_0_rgb(16,185,129,0.7)] active:shadow-none active:translate-y-[6px] transition-all`}
        >
          <span className="text-xl">{isLoading ? '⌛' : '✅'}</span>
          <span>{isLoading ? '核對中...' : '核對答案'}</span>
        </button>

        <button 
          onClick={onReset}
          className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-stone-600 hover:bg-stone-700 text-white font-black rounded-2xl shadow-[0_6px_0_rgb(68,64,60)] active:shadow-none active:translate-y-[6px] transition-all sm:min-w-[140px]"
        >
          <span className="text-xl">🔄</span>
          <span>歸零</span>
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
