
import React from 'react';
import { ColumnData, BeadState } from '../types';

interface AbacusColumnProps {
  data: ColumnData;
  onBeadClick: (colId: number, type: 'top' | 'bottom', index?: number) => void;
  isActive: boolean;
}

const AbacusColumn: React.FC<AbacusColumnProps> = ({ data, onBeadClick, isActive }) => {
  return (
    <div className={`relative w-16 flex flex-col items-center mx-1 rounded-xl transition-all duration-500 ${isActive ? 'bg-amber-400/20 ring-2 ring-amber-400/50' : 'bg-transparent'}`}>
      
      {/* 頂部數值顯示 */}
      <div className="h-10 flex items-center justify-center">
        <span className={`text-lg font-black ${data.value > 0 ? 'text-amber-400' : 'text-stone-500'} transition-colors`}>
          {data.value}
        </span>
      </div>

      <div className="relative w-full h-[320px] flex flex-col items-center">
        {/* Column Rod - 算盤軸心 */}
        <div className="absolute w-2 h-full bg-gradient-to-r from-stone-700 to-stone-800 z-0 shadow-inner left-1/2 -translate-x-1/2"></div>
        
        {/* Top Section - 上珠區 (天) */}
        <div className="relative w-full h-[80px] flex justify-center">
          <div 
            onClick={() => onBeadClick(data.id, 'top')}
            className={`absolute w-14 h-9 rounded-full bead-shadow cursor-pointer z-10 bead-transition
              ${data.state.top ? 'bg-amber-500 top-[36px] bead-active-shadow' : 'bg-amber-200 top-[4px]'}
            `}
          />
        </div>

        {/* Dividing Bar - 橫桿 (梁) */}
        <div className="w-full h-5 bg-stone-900 z-20 shadow-[0_2px_8px_rgba(0,0,0,0.6)] border-y border-stone-700 relative">
            {/* 梁上的位數標記 (小圓點) */}
            {(data.id === 2 || data.id === 5 || data.id === 8) && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-stone-300 rounded-full shadow-sm"></div>
            )}
        </div>

        {/* Bottom Section - 下珠區 (地) */}
        <div className="relative w-full flex-1 flex flex-col items-center">
          {data.state.bottom.map((active, i) => {
              // 重新計算位移，確保與橫桿有適當距離且不會重疊
              const baseY = i * 42 + 20;
              const activeOffset = -18; // 向上撥動貼合橫桿
              const topPos = active ? baseY + activeOffset : baseY + 10;

              return (
                <div 
                  key={i}
                  onClick={() => onBeadClick(data.id, 'bottom', i)}
                  style={{ top: `${topPos}px` }}
                  className={`absolute w-14 h-9 rounded-full bead-shadow cursor-pointer z-10 bead-transition
                    ${active ? 'bg-amber-500 bead-active-shadow' : 'bg-amber-200'}
                  `}
                />
              );
          })}
        </div>
      </div>
      
      {/* 底部輔助標記 (可選) */}
      <div className="h-6 flex items-center justify-center">
        <div className="w-1 h-1 bg-stone-600 rounded-full opacity-30"></div>
      </div>
    </div>
  );
};

export default AbacusColumn;
