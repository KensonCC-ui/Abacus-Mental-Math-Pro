
import React, { useState } from 'react';
import { Difficulty } from '../types';

interface ControlPanelProps {
  onNewTask: (diff: Difficulty) => void;
  onStartQuiz: (diff: Difficulty, mode: 'countdown' | 'stopwatch', mins: number) => void;
  onCheck: () => void;
  onReset: () => void;
  onTeach: () => void;
  isTeaching: boolean;
  isQuizActive: boolean;
  hasQuestion: boolean;
  hasChecked: boolean;
  durationInput: number;
  setDurationInput: (val: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onNewTask, onStartQuiz, onCheck, onReset, onTeach, 
  isTeaching, isQuizActive, hasQuestion, hasChecked,
  durationInput, setDurationInput
}) => {
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('stopwatch');
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(Difficulty.UNIT);

  const diffs = [
    { id: Difficulty.UNIT, label: '個位' },
    { id: Difficulty.TENS, label: '十位' },
    { id: Difficulty.HUNDREDS, label: '百位' },
    { id: Difficulty.THOUSANDS, label: '千位' },
    { id: Difficulty.MIXED, label: '隨機' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-10">
      {!isQuizActive ? (
        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-stone-100 shadow-2xl space-y-8 sm:space-y-12">
          {/* 第一步：難度選擇區 */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-500 mb-6 sm:mb-8 text-center uppercase tracking-[0.2em]">第一步：選擇挑戰難度</h3>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4">
              {diffs.map((d) => (
                <button 
                  key={d.id}
                  onClick={() => { setSelectedDiff(d.id); onNewTask(d.id); }}
                  className={`py-4 sm:py-5 px-6 sm:px-10 rounded-2xl sm:rounded-3xl font-black transition-all active:scale-95 text-base sm:text-xl border-b-4 ${
                    selectedDiff === d.id 
                    ? 'bg-amber-500 text-white shadow-lg border-amber-700' 
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 第二步：計時設定與開始按鈕並列 */}
          <div className="border-t-2 border-stone-50 pt-8 sm:pt-12">
            <h3 className="text-xl sm:text-2xl font-black text-stone-500 mb-6 sm:mb-8 text-center uppercase tracking-[0.2em]">第二步：設定與開始</h3>
            
            <div className="flex flex-col md:flex-row items-stretch gap-4 sm:gap-6">
              {/* 計時設定區 */}
              <div className="flex-1 bg-stone-50 p-4 sm:p-6 rounded-[2.5rem] border-2 border-stone-100 space-y-4 flex flex-col justify-center">
                <div className="flex gap-2 p-1.5 bg-stone-200 rounded-2xl">
                  <button 
                    onClick={() => setTimerMode('stopwatch')} 
                    className={`flex-1 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-black transition-all ${timerMode === 'stopwatch' ? 'bg-white text-stone-800 shadow-md' : 'text-stone-500 hover:text-stone-600'}`}
                  >
                    ⏱️ 正計時
                  </button>
                  <button 
                    onClick={() => setTimerMode('countdown')} 
                    className={`flex-1 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-black transition-all ${timerMode === 'countdown' ? 'bg-white text-stone-800 shadow-md' : 'text-stone-500 hover:text-stone-600'}`}
                  >
                    ⏳ 倒數計時
                  </button>
                </div>
                
                {timerMode === 'countdown' ? (
                  <div className="flex items-center justify-center gap-3 bg-white py-3 px-4 rounded-2xl border border-stone-200 shadow-sm animate-in fade-in zoom-in duration-300">
                    <span className="text-sm sm:text-base font-bold text-stone-500">測驗長度:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="60" 
                      value={durationInput} 
                      onChange={(e) => setDurationInput(Math.max(1, parseInt(e.target.value) || 1))} 
                      className="w-16 bg-amber-50 border-2 border-amber-100 rounded-xl py-1 px-2 font-black text-center text-amber-600 text-xl focus:outline-none"
                    />
                    <span className="text-sm sm:text-base font-black text-stone-500">分鐘</span>
                  </div>
                ) : (
                  <div className="py-3 px-4 text-center text-stone-400 text-xs sm:text-sm font-bold animate-in fade-in duration-300">
                    測驗將從 00:00 開始計時
                  </div>
                )}
              </div>

              {/* 開始按鈕 */}
              <button 
                onClick={() => onStartQuiz(selectedDiff, timerMode, durationInput)} 
                className="flex-[1.5] py-8 sm:py-10 bg-rose-500 text-white font-black rounded-[2.5rem] shadow-2xl hover:bg-rose-600 transition-all active:scale-95 text-2xl sm:text-4xl border-b-[8px] border-rose-800 active:border-b-0 flex flex-col items-center justify-center gap-1 sm:gap-2"
              >
                🚀 開始測驗
                <span className="text-xs sm:text-base font-bold opacity-80 uppercase tracking-widest">共 10 題 · 限時挑戰</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 功能操作按鈕 */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 px-2">
        {!isQuizActive && (
          <button 
            disabled={!hasQuestion || isTeaching} 
            onClick={onTeach} 
            className="flex-1 py-6 sm:py-8 bg-orange-400 hover:bg-orange-500 disabled:bg-stone-100 disabled:text-stone-300 text-white font-black rounded-[2rem] sm:rounded-[3rem] shadow-xl transition-all active:scale-95 text-xl sm:text-3xl border-b-8 border-orange-600 active:border-b-0 disabled:border-b-0"
          >
            演示教學
          </button>
        )}
        <button 
          disabled={!hasQuestion || hasChecked} 
          onClick={onCheck} 
          className="flex-1 py-6 sm:py-8 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-100 disabled:text-stone-300 text-white font-black rounded-[2rem] sm:rounded-[3rem] shadow-xl transition-all active:scale-95 text-xl sm:text-3xl border-b-8 border-emerald-700 active:border-b-0 disabled:border-b-0"
        >
          {hasChecked ? '已核對答案' : '核對答案 ✅'}
        </button>
        <button 
          onClick={onReset} 
          className="px-10 py-6 sm:py-8 sm:min-w-[180px] bg-stone-600 hover:bg-stone-700 text-white font-black rounded-[2rem] sm:rounded-[3rem] shadow-xl transition-all active:scale-95 text-xl sm:text-3xl border-b-8 border-stone-800 active:border-b-0"
        >
          歸零
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
