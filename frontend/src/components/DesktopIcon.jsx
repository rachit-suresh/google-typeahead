import React from 'react';

export default function DesktopIcon({ label, iconSymbol, onOpen, colorClass = 'bg-[#008080]' }) {
  return (
    <div 
      onDoubleClick={onOpen}
      onTouchEnd={onOpen}
      className="flex flex-col items-center gap-1 w-16 p-1 cursor-pointer select-none group focus:outline-none"
      title="Double click to open"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
    >
      {/* 3D Icon container */}
      <div className={`win95-outset w-10 h-10 flex items-center justify-center text-white text-lg font-bold select-none ${colorClass} group-hover:bg-opacity-80 active:[border-color:#808080_#fff_#fff_#808080]`}>
        <span className="drop-shadow-[1px_1px_0px_#000000]">{iconSymbol}</span>
      </div>
      
      {/* Label text */}
      <span className="text-[10px] text-white font-win bg-black/50 px-1 text-center leading-tight tracking-wide group-hover:bg-win-navy group-hover:text-white border border-transparent group-hover:border-dotted group-hover:border-white">
        {label}
      </span>
    </div>
  );
}
