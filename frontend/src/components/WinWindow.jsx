import React from 'react';

export default function WinWindow({ title, children, onClose }) {
  return (
    <div className="win95-outset bg-win-gray p-1 font-win max-w-2xl w-full">
      {/* Title Bar */}
      <div className="bg-gradient-to-r from-win-navy to-win-blue px-2 py-1 flex items-center justify-between text-white font-bold select-none">
        <span className="text-sm tracking-wide">{title}</span>
        {/* Window controls */}
        <div className="flex items-center gap-0.5">
          <button 
            type="button" 
            className="win95-outset bg-win-gray text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center pb-1 active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-none"
          >
            _
          </button>
          <button 
            type="button" 
            className="win95-outset bg-win-gray text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center pb-0.5 active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-none"
          >
            &#9633;
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="win95-outset bg-win-gray text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center pb-0.5 ml-1 active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-none"
          >
            X
          </button>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="flex items-center gap-4 px-2 py-1 text-xs border-b-2 border-win-border-dark mb-2 select-none">
        <span className="cursor-pointer hover:bg-win-navy hover:text-white px-1"><span className="underline">F</span>ile</span>
        <span className="cursor-pointer hover:bg-win-navy hover:text-white px-1"><span className="underline">E</span>dit</span>
        <span className="cursor-pointer hover:bg-win-navy hover:text-white px-1"><span className="underline">S</span>earch</span>
        <span className="cursor-pointer hover:bg-win-navy hover:text-white px-1"><span className="underline">H</span>elp</span>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
