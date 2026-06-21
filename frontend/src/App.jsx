import React, { useState, useEffect } from 'react';
import RetroHeader from './components/RetroHeader';
import WinWindow from './components/WinWindow';
import SearchBar from './components/SearchBar';
import DesktopIcon from './components/DesktopIcon';

export default function App() {
  // Window open/close states
  const [windows, setWindows] = useState({
    searchApp: true,
    readme: false,
    systemStats: false,
    recycleBin: false,
    guestbook: false,
  });

  // Z-index layering state
  const [activeWindow, setActiveWindow] = useState('searchApp');

  // Search state
  const [searchResult, setSearchResult] = useState(null);
  const [showResultWindow, setShowResultWindow] = useState(false);

  // Guestbook comments state
  const [guestbookEntries, setGuestbookEntries] = useState([
    { name: 'surfer_dude', msg: 'Cool page! I love the animations! Check out my site at http://geocities.com/retro_hacker99', date: '06/21/1997' },
    { name: 'web_master_95', msg: 'First time visiting, great typeahead speed. Very stable on my dial-up connection.', date: '05/14/1997' },
    { name: 'concerned_netizen', msg: 'Is this Java 25 thing safe? My browser warned me about applets.', date: '04/02/1997' }
  ]);
  const [gbName, setGbName] = useState('');
  const [gbMsg, setGbMsg] = useState('');

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (query) => {
    setSearchResult(query);
    setShowResultWindow(true);
  };

  const handleWindowOpen = (name) => {
    setWindows(prev => ({ ...prev, [name]: true }));
    setActiveWindow(name);
  };

  const handleWindowClose = (name) => {
    setWindows(prev => ({ ...prev, [name]: false }));
  };

  const handleFocus = (name) => {
    setActiveWindow(name);
  };

  const handleAddGuestbook = (e) => {
    e.preventDefault();
    if (!gbName.trim() || !gbMsg.trim()) return;
    const newEntry = {
      name: gbName.trim(),
      msg: gbMsg.trim(),
      date: new Date().toLocaleDateString()
    };
    setGuestbookEntries(prev => [newEntry, ...prev]);
    setGbName('');
    setGbMsg('');
  };

  return (
    <div className="bg-90s-tile w-screen h-screen flex flex-col p-3 overflow-hidden select-none font-win relative">
      {/* Top Banner / Scrolling Marquee */}
      <RetroHeader />

      {/* Main Desktop Space */}
      <div className="flex-1 flex relative items-start justify-start gap-4">
        
        {/* Desktop Icons column */}
        <div className="flex flex-col gap-4 py-2 z-10">
          <DesktopIcon 
            label="My Computer" 
            iconSymbol="💻" 
            onOpen={() => handleWindowOpen('systemStats')} 
            colorClass="bg-[#000080]"
          />
          <DesktopIcon 
            label="Search 97" 
            iconSymbol="🔍" 
            onOpen={() => handleWindowOpen('searchApp')} 
            colorClass="bg-[#800080]"
          />
          <DesktopIcon 
            label="readme.txt" 
            iconSymbol="📝" 
            onOpen={() => handleWindowOpen('readme')} 
            colorClass="bg-[#808080]"
          />
          <DesktopIcon 
            label="Guestbook" 
            iconSymbol="📖" 
            onOpen={() => handleWindowOpen('guestbook')} 
            colorClass="bg-[#008000]"
          />
          <DesktopIcon 
            label="Recycle Bin" 
            iconSymbol="🗑️" 
            onOpen={() => handleWindowOpen('recycleBin')} 
            colorClass="bg-[#800000]"
          />
        </div>

        {/* WINDOW 1: Primary Search Panel */}
        {windows.searchApp && (
          <div 
            onClick={() => handleFocus('searchApp')}
            className={`absolute left-[10%] md:left-[20%] top-[5%] ${activeWindow === 'searchApp' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Search Engine 97" onClose={() => handleWindowClose('searchApp')}>
              <div className="flex flex-col gap-3 w-80 md:w-110">
                <div className="text-xs text-black border-b-2 border-win-border-dark pb-2 leading-relaxed">
                  Welcome to the World Wide Web search directory. Enter a search query below to scan 
                  our extensive index of internet entries. Results will populate instantly.
                </div>
                <SearchBar onSearch={handleSearchSubmit} />
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 2: Notepad Readme Window */}
        {windows.readme && (
          <div 
            onClick={() => handleFocus('readme')}
            className={`absolute left-[15%] md:left-[30%] top-[15%] ${activeWindow === 'readme' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="readme.txt - Notepad" onClose={() => handleWindowClose('readme')}>
              <div className="flex flex-col gap-3 w-80 md:w-120">
                <div className="win95-inset bg-white p-2 font-win-mono text-[11px] text-black h-48 overflow-y-auto leading-relaxed border-2 border-win-border-dark">
                  <p className="font-bold border-b border-win-border-dark pb-1 mb-2 select-text">--- SEARCH 97 USER GUIDE ---</p>
                  <p className="mb-2 select-text">* To search, type a prefix into the query box. Matches will populate from the database dynamically.</p>
                  <p className="mb-2 select-text">* Use Arrow keys to navigate suggestions, and press Enter to select.</p>
                  <p className="mb-2 select-text">* Clicking search or hitting Enter sends a POST request updating the popularity count.</p>
                  <p className="mb-2 select-text">* Database consists of 1.2M aggregated AOL user search log queries.</p>
                  <p className="font-bold mt-4 border-t border-win-border-dark pt-2 select-text">System Specs:</p>
                  <p className="select-text">- Backend: Spring Boot 4.0.0, Java 25, Hibernate 7</p>
                  <p className="select-text">- Database: PostgreSQL Index-Optimized Queries</p>
                </div>
                
                {/* 88x31 Nostalgic web buttons */}
                <div className="border-t-2 border-win-border-dark pt-3 flex flex-wrap gap-2 justify-center select-none">
                  {/* Badge 1: Netscape Enhanced */}
                  <div className="win95-outset bg-[#000080] text-white font-win font-bold text-[8px] px-1 py-0.5 border-win-border-light h-6 flex items-center justify-center tracking-wider w-20">
                    NETSCAPE 4.0+
                  </div>
                  {/* Badge 2: Java Powered */}
                  <div className="win95-outset bg-gradient-to-r from-red-600 to-orange-500 text-white font-win-heavy text-[8px] px-1 py-0.5 border-win-border-light h-6 flex items-center justify-center tracking-wider w-20">
                    JAVA POWERED
                  </div>
                  {/* Badge 3: Notepad Designed */}
                  <div className="win95-outset bg-[#00aa00] text-white font-win-mono text-[8px] px-1 py-0.5 border-win-border-light h-6 flex items-center justify-center tracking-wider w-20">
                    NOTEPAD 97
                  </div>
                  {/* Badge 4: Postgres */}
                  <div className="win95-outset bg-[#336791] text-white font-win font-bold text-[8px] px-1 py-0.5 border-win-border-light h-6 flex items-center justify-center tracking-wider w-20">
                    POSTGRESQL
                  </div>
                </div>
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 3: My Computer / System Properties */}
        {windows.systemStats && (
          <div 
            onClick={() => handleFocus('systemStats')}
            className={`absolute left-[5%] md:left-[25%] top-[25%] ${activeWindow === 'systemStats' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="System Properties" onClose={() => handleWindowClose('systemStats')}>
              <div className="flex flex-col gap-4 w-80 md:w-100 font-win">
                {/* Tab layout style wrapper */}
                <div className="border-b border-win-border-dark pb-2 flex gap-1 text-xs select-none">
                  <span className="bg-win-gray px-3 py-1 win95-outset border-b-0 font-bold">General</span>
                  <span className="bg-win-gray px-3 py-1 text-win-border-dark cursor-not-allowed">Performance</span>
                  <span className="bg-win-gray px-3 py-1 text-win-border-dark cursor-not-allowed">Hardware</span>
                </div>

                <div className="flex gap-4 items-start mt-2">
                  <div className="win95-outset bg-win-navy text-white text-3xl font-bold w-12 h-12 flex items-center justify-center select-none border-win-border-light">
                    💻
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div>
                      <h4 className="font-bold border-b border-win-border-dark pb-0.5 mb-1">System:</h4>
                      <p>Microsoft Windows 97</p>
                      <p>Vite/React Dev Station</p>
                    </div>
                    <div>
                      <h4 className="font-bold border-b border-win-border-dark pb-0.5 mb-1">Backend Stack:</h4>
                      <p>Java Platform: JDK 25 (version 25.0.1)</p>
                      <p>Spring Boot: v4.0.0 (Hibernate 7.1)</p>
                      <p>Database: PostgreSQL (1.2M queries)</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Color Grid from the Design System */}
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-win-border-dark mb-1 select-none">System Color Calibration:</h4>
                  <div className="grid grid-cols-6 gap-1 w-full max-w-[200px] select-none">
                    <div className="win95-outset bg-red-600 h-5 w-5 border-red-500"></div>
                    <div className="win95-outset bg-yellow-300 h-5 w-5 border-yellow-200"></div>
                    <div className="win95-outset bg-green-600 h-5 w-5 border-green-500"></div>
                    <div className="win95-outset bg-blue-600 h-5 w-5 border-blue-500"></div>
                    <div className="win95-outset bg-purple-600 h-5 w-5 border-purple-500"></div>
                    <div className="win95-outset bg-black h-5 w-5 border-gray-800"></div>
                  </div>
                </div>
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 4: Guestbook Window */}
        {windows.guestbook && (
          <div 
            onClick={() => handleFocus('guestbook')}
            className={`absolute left-[8%] md:left-[35%] top-[10%] ${activeWindow === 'guestbook' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Guestbook - Sign In" onClose={() => handleWindowClose('guestbook')}>
              <div className="flex flex-col gap-3 w-80 md:w-110">
                {/* Form to submit guestbook comments */}
                <form onSubmit={handleAddGuestbook} className="flex flex-col gap-2 border-b-2 border-win-border-dark pb-3">
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-[10px] font-bold uppercase">Name:</label>
                      <input 
                        type="text" 
                        value={gbName}
                        onChange={e => setGbName(e.target.value)}
                        placeholder="Anonymous surfer"
                        className="win95-inset px-2 py-0.5 text-xs text-black w-full focus:outline-dotted focus:outline-1 focus:outline-black focus:outline-offset-[-2px]" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-bold uppercase">Message:</label>
                    <textarea 
                      value={gbMsg}
                      onChange={e => setGbMsg(e.target.value)}
                      placeholder="Type signature message..."
                      rows="2"
                      className="win95-inset px-2 py-0.5 text-xs text-black w-full focus:outline-dotted focus:outline-1 focus:outline-black focus:outline-offset-[-2px] resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="win95-outset bg-win-gray text-black text-xs font-bold px-3 py-1 self-end hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black"
                  >
                    Sign Guestbook
                  </button>
                </form>

                {/* Listing of posts */}
                <div className="win95-inset bg-white p-1 max-h-40 overflow-y-auto border-2 border-win-border-dark">
                  {guestbookEntries.map((item, idx) => {
                    const isOdd = idx % 2 !== 0;
                    return (
                      <div 
                        key={idx} 
                        className={`p-2 border-b border-win-border-dark flex flex-col gap-0.5 text-xs ${isOdd ? 'bg-[#E8E8E8]' : 'bg-white'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-win-navy">
                          <span>{item.name}</span>
                          <span className="font-win-mono text-win-border-dark">{item.date}</span>
                        </div>
                        <p className="text-black select-text break-words font-win-mono leading-tight">{item.msg}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 5: Recycle Bin Window */}
        {windows.recycleBin && (
          <div 
            onClick={() => handleFocus('recycleBin')}
            className={`absolute left-[20%] md:left-[45%] top-[30%] ${activeWindow === 'recycleBin' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Recycle Bin" onClose={() => handleWindowClose('recycleBin')}>
              <div className="flex flex-col gap-4 w-72 md:w-80 font-win text-center items-center justify-center py-4">
                <span className="text-4xl select-none">🗑️</span>
                <div className="text-xs text-black">
                  The Recycle Bin is currently empty.
                </div>
                <button
                  type="button"
                  onClick={() => alert('Recycle Bin is already empty!')}
                  className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1.5 hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
                >
                  Empty Recycle Bin
                </button>
              </div>
            </WinWindow>
          </div>
        )}

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
              {/* Retro Info Icon */}
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
        <div className="flex items-center gap-1.5">
          {/* Start Button */}
          <button 
            type="button" 
            onClick={() => alert('Start Menu is under construction!')}
            className="win95-outset px-2 py-0.5 flex items-center gap-1 font-bold text-xs h-7 hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
          >
            {/* Windows 95 start icon */}
            <div className="grid grid-cols-2 gap-0.5 w-3 h-3 flex-shrink-0">
              <div className="bg-red-500 win95-outset border-[0.5px]"></div>
              <div className="bg-green-500 win95-outset border-[0.5px]"></div>
              <div className="bg-blue-500 win95-outset border-[0.5px]"></div>
              <div className="bg-yellow-500 win95-outset border-[0.5px]"></div>
            </div>
            Start
          </button>
          
          <div className="w-[2px] h-6 bg-[#808080] border-r border-[#ffffff]"></div>

          {/* Active taskbar list items */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {windows.searchApp && (
              <button 
                onClick={() => handleFocus('searchApp')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'searchApp' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                🔍 Search 97
              </button>
            )}
            {windows.readme && (
              <button 
                onClick={() => handleFocus('readme')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'readme' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                📝 readme.txt
              </button>
            )}
            {windows.systemStats && (
              <button 
                onClick={() => handleFocus('systemStats')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'systemStats' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                💻 Properties
              </button>
            )}
            {windows.guestbook && (
              <button 
                onClick={() => handleFocus('guestbook')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'guestbook' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                📖 Guestbook
              </button>
            )}
          </div>
        </div>

        {/* System tray */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Hit Counter stats */}
          <div className="win95-inset px-2 py-0.5 bg-black text-[#00ff00] font-win-mono text-[9px] select-none h-6 flex items-center gap-1">
            <span>HITS:</span>
            <span className="bg-[#111111] px-1 py-0.5 text-rainbow font-bold font-win-mono border border-win-border-dark">0001997</span>
          </div>

          {/* Clock stamp */}
          <div className="win95-inset px-2 py-0.5 bg-win-gray text-black font-win-mono text-[10px] select-none h-6 flex items-center border-[#808080]">
            🔊 {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
