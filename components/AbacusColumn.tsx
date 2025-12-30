
import React from 'react';
import { ColumnData, BeadState } from '../types';

interface AbacusColumnProps {
  data: ColumnData;
  onBeadClick: (colId: number, type: 'top' | 'bottom', index?: number) => void;
  isActive: boolean;
  isError?: boolean;
}

const AbacusColumn: React.FC<AbacusColumnProps> = ({ data, onBeadClick, isActive, isError }) => {
  return (
    <div className={`relative w-12 sm:w-16 flex flex-col items-center mx-0.5 sm:mx-1 rounded-2xl transition-all duration-500 
      ${isActive ? (isError ? 'bg-rose-500/20 ring-4 ring-rose-500/50 animate-pulse' : 'bg-amber-400/20 ring-4 ring-amber-400/50') : 'bg-transparent'}
    `}>
      
      {/* 頂部數值顯示 */}
      <div className="h-8 sm:h-10 flex items-center justify-center">
        <span className={`text-sm sm:text-lg font-black transition-colors ${
            isError ? 'text-rose-500 animate-bounce' : 
            data.value > 0 ? 'text-amber-400' : 'text-stone-500'
        }`}>
          {data.value}
        </span>
      </div>

      <div className="relative w-full h-[280px] sm:h-[320px] flex flex-col items-center">
        {/* Column Rod */}
        <div className={`absolute w-1.5 sm:w-2 h-full z-0 shadow-inner left-1/2 -translate-x-1/2 transition-colors duration-500 ${
            isError ? 'bg-rose-900' : 'bg-gradient-to-r from-stone-700 to-stone-800'
        }`}></div>
        
        {/* Top Section */}
        <div className="relative w-full h-[70px] sm:h-[80px] flex justify-center">
          <div 
            onClick={() => onBeadClick(data.id, 'top')}
            className={`absolute w-10 sm:w-14 h-7 sm:h-9 rounded-full bead-shadow cursor-pointer z-10 bead-transition
              ${data.state.top ? (isError ? 'bg-rose-600 top-[32px] sm:top-[36px] bead-active-shadow' : 'bg-amber-500 top-[32px] sm:top-[36px] bead-active-shadow') : (isError ? 'bg-rose-200 top-[4px]' : 'bg-amber-200 top-[4px]')}
            `}
          />
        </div>

        {/* Dividing Bar */}
        <div className={`w-full h-4 sm:h-5 z-20 shadow-[0_2px_8px_rgba(0,0,0,0.6)] border-y border-stone-700 relative transition-colors ${
            isError ? 'bg-rose-950' : 'bg-stone-900'
        }`}>
            {(data.id === 2 || data.id === 5 || data.id === 8) && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 sm:h-1.5 w-1 sm:h-1.5 bg-stone-300 rounded-full"></div>
            )}
        </div>

        {/* Bottom Section */}
        <div className="relative w-full flex-1 flex flex-col items-center">
          {data.state.bottom.map((active, i) => {
              const baseY = i * 36 + 15;
              const activeOffset = -15; 
              const topPos = active ? baseY + activeOffset : baseY + 5;

              return (
                <div 
                  key={i}
                  onClick={() => onBeadClick(data.id, 'bottom', i)}
                  style={{ top: `${topPos}px` }}
                  className={`absolute w-10 sm:w-14 h-7 sm:h-9 rounded-full bead-shadow cursor-pointer z-10 bead-transition
                    ${active ? (isError ? 'bg-rose-600 bead-active-shadow' : 'bg-amber-500 bead-active-shadow') : (isError ? 'bg-rose-200' : 'bg-amber-200')}
                  `}
                />
              );
          })}
        </div>
      </div>
    </div>
  );
};

export default AbacusColumn;
