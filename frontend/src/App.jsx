import React, { useState } from 'react';
import RetroHeader from './components/RetroHeader';
import WinWindow from './components/WinWindow';
import SearchBar from './components/SearchBar';

export default function App() {
  const [searchResult, setSearchResult] = useState(null);
  const [showResultWindow, setShowResultWindow] = useState(false);

  const handleSearchSubmit = (query) => {
    if (!query.trim()) return;
    setSearchResult(query);
    setShowResultWindow(true);
  };

  return (
    <div className="bg-90s-tile w-screen h-screen flex flex-col p-4 overflow-auto select-none pb-16 font-win">
      {/* Top Banner & Marquee */}
      <RetroHeader />

      {/* Main Desktop Search Area */}
      <div className="flex-1 flex justify-center items-center py-6">
        <WinWindow title="Search Engine 97" onClose={() => alert('Cannot close the primary search application!')}>
          <div className="flex flex-col gap-4">
            <div className="text-xs text-black border-b border-win-border-dark pb-2 leading-relaxed">
              Welcome to the World Wide Web search directory. Enter a search query below to scan 
              our extensive index of internet entries. Results will populate instantly.
            </div>
            
            <SearchBar onSearch={handleSearchSubmit} />
          </div>
        </WinWindow>
      </div>

      {/* Pop-up Windows 95 Dialog box for Search Success */}
      {showResultWindow && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="win95-outset bg-win-gray p-1 font-win w-80 shadow-2xl">
            {/* Dialog Title Bar */}
            <div className="bg-gradient-to-r from-win-navy to-win-blue px-2 py-0.5 flex items-center justify-between text-white font-bold text-xs select-none">
              <span>Search Status</span>
              <button 
                type="button" 
                onClick={() => setShowResultWindow(false)}
                className="win95-outset bg-win-gray text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center pb-0.5 active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-none"
              >
                X
              </button>
            </div>
            {/* Dialog Content */}
            <div className="p-4 flex gap-3 items-start bg-win-gray">
              {/* Retro Info Icon (Exclamation mark inside a blue square) */}
              <div className="win95-outset bg-[#000080] text-white font-serif font-bold text-lg w-8 h-8 flex items-center justify-center flex-shrink-0 border-win-border-light select-none">
                i
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs text-black leading-relaxed">
                  Search query submitted successfully:
                  <br />
                  <strong className="text-win-navy font-win-mono font-bold break-all">"{searchResult}"</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowResultWindow(false)}
                  className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1 self-end uppercase hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Windows 95 Taskbar */}
      <div className="bg-win-gray win95-outset border-t-2 border-win-border-light flex items-center justify-between px-2 fixed bottom-0 left-0 right-0 h-10 select-none z-40">
        <div className="flex items-center gap-2">
          {/* Start Button */}
          <button 
            type="button" 
            onClick={() => alert('Start Menu is under construction!')}
            className="win95-outset px-2 py-1 flex items-center gap-1 font-bold text-xs hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
          >
            {/* Windows 95 start icon (four tiny color squares) */}
            <div className="grid grid-cols-2 gap-0.5 w-3 h-3 flex-shrink-0">
              <div className="bg-red-500 win95-outset border-[0.5px]"></div>
              <div className="bg-green-500 win95-outset border-[0.5px]"></div>
              <div className="bg-blue-500 win95-outset border-[0.5px]"></div>
              <div className="bg-yellow-500 win95-outset border-[0.5px]"></div>
            </div>
            Start
          </button>
          
          {/* Active tasks */}
          <div className="win95-inset bg-win-gray px-3 py-1 flex items-center gap-1 text-[11px] font-bold h-7 border-[#808080] select-none">
            <div className="w-2.5 h-2.5 bg-green-500 animate-blink rounded-full border border-black"></div>
            Search Engine 97
          </div>
        </div>

        {/* System tray / Hit counter */}
        <div className="flex items-center gap-2">
          {/* Hit Counter */}
          <div className="win95-inset px-2 py-0.5 bg-black text-[#00ff00] font-win-mono text-[10px] select-none h-6 flex items-center gap-1">
            <span>HITS:</span>
            <span className="bg-[#111111] px-1 py-0.5 text-rainbow font-bold font-win-mono border border-win-border-dark">0001997</span>
          </div>

          {/* Time stamp */}
          <div className="win95-inset px-2 py-0.5 bg-win-gray text-black font-win-mono text-[10px] select-none h-6 flex items-center">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
