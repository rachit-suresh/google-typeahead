import React, { useState, useEffect } from 'react';
import RetroHeader from './components/RetroHeader';
import WinWindow from './components/WinWindow';
import SearchBar from './components/SearchBar';
import DesktopIcon from './components/DesktopIcon';
import CacheMonitor from './components/CacheMonitor';

export default function App() {
  // Window open/close states
  const [windows, setWindows] = useState({
    searchApp: true,
    readme: false,
    systemStats: false,
    recycleBin: false,
    guestbook: false,
    webDirectory: true, // open by default
    dialUp: false,
    cacheMonitor: true, // open by default
  });

  // Z-index layering state
  const [activeWindow, setActiveWindow] = useState('searchApp');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showResultWindow, setShowResultWindow] = useState(false);

  // Cache statistics state
  const [cacheStats, setCacheStats] = useState(null);

  // Dial-up state variables
  const [dialState, setDialState] = useState('idle'); // 'idle', 'initializing', 'dialing', 'answering', 'negotiating', 'verifying', 'connected'
  const [dialLog, setDialLog] = useState([]);
  const [dialProgress, setDialProgress] = useState(0);
  const [connectedTime, setConnectedTime] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);

  // Guestbook comments state
  const [guestbookEntries, setGuestbookEntries] = useState([
    { name: 'surfer_dude', msg: 'Cool page! I love the animations! Check out my site at http://geocities.com/retro_hacker99', date: '06/21/1997' },
    { name: 'web_master_95', msg: 'First time visiting, great typeahead speed. Very stable on my dial-up connection.', date: '05/14/1997' },
    { name: 'concerned_netizen', msg: 'Is this Java 25 thing safe? My browser warned me about applets.', date: '04/02/1997' }
  ]);
  const [gbName, setGbName] = useState('');
  const [gbMsg, setGbMsg] = useState('');

  // Clock state and Cache stats polling
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = () => {
      fetch('http://localhost:8080/cache/stats')
        .then(res => {
          if (!res.ok) throw new Error('Stats API offline');
          return res.json();
        })
        .then(data => setCacheStats(data))
        .catch(err => console.warn("Cache stats service offline"));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dial-up simulation sequence
  useEffect(() => {
    let timer;
    if (dialState === 'initializing') {
      setDialProgress(10);
      setDialLog(['ATZ', 'OK']);
      timer = setTimeout(() => {
        setDialState('dialing');
      }, 1200);
    } else if (dialState === 'dialing') {
      setDialProgress(30);
      setDialLog(prev => [...prev, 'ATDT 1-800-472-8438', 'Dialing...']);
      timer = setTimeout(() => {
        setDialState('answering');
      }, 1200);
    } else if (dialState === 'answering') {
      setDialProgress(55);
      setDialLog(prev => [...prev, 'Ring...', 'Answered', 'Carrier detected']);
      timer = setTimeout(() => {
        setDialState('negotiating');
      }, 1200);
    } else if (dialState === 'negotiating') {
      setDialProgress(75);
      setDialLog(prev => [...prev, 'Protocol negotiation...', 'LCP opened', 'IPCP negotiating']);
      timer = setTimeout(() => {
        setDialState('verifying');
      }, 1200);
    } else if (dialState === 'verifying') {
      setDialProgress(90);
      setDialLog(prev => [...prev, 'Verifying username and password...']);
      timer = setTimeout(() => {
        setDialState('connected');
        setDialProgress(100);
        setDialLog(prev => [...prev, 'CONNECT 28800', 'Login successful. Connected to internet.']);
      }, 1200);
    }

    return () => clearTimeout(timer);
  }, [dialState]);

  // Connected duration and bytes timer
  useEffect(() => {
    let interval;
    if (dialState === 'connected') {
      setConnectedTime(0);
      setBytesSent(Math.floor(Math.random() * 500) + 100);
      setBytesReceived(Math.floor(Math.random() * 1000) + 200);
      
      interval = setInterval(() => {
        setConnectedTime(prev => prev + 1);
        setBytesSent(prev => prev + Math.floor(Math.random() * 40) + 5);
        setBytesReceived(prev => prev + Math.floor(Math.random() * 120) + 10);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dialState]);

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleSearchSubmit = (query) => {
    setSearchResult(query);
    setShowResultWindow(true);
  };

  const triggerSearch = (queryVal) => {
    setSearchQuery(queryVal);
    
    // Call the POST /search/submit Node.js API to record/increment query count
    fetch('http://localhost:8081/search/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryVal.trim() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to record search');
        return res.json();
      })
      .then(() => {
        handleSearchSubmit(queryVal);
      })
      .catch((err) => {
        console.error('Error submitting search from directory:', err);
        handleSearchSubmit(queryVal); // Fallback: still notify UI
      });
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
            label="Directory 97" 
            iconSymbol="🗂️" 
            onOpen={() => handleWindowOpen('webDirectory')} 
            colorClass="bg-[#808000]"
          />
          <DesktopIcon 
            label="Dial-Up" 
            iconSymbol="🌐" 
            onOpen={() => handleWindowOpen('dialUp')} 
            colorClass="bg-[#008080]"
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
          <DesktopIcon 
            label="Cache Ring" 
            iconSymbol="⭕" 
            onOpen={() => handleWindowOpen('cacheMonitor')} 
            colorClass="bg-[#000080]"
          />
        </div>

        {/* WINDOW 1: Primary Search Panel */}
        {windows.searchApp && (
          <div 
            onClick={() => handleFocus('searchApp')}
            className={`absolute left-[4%] md:left-[8%] top-[6%] ${activeWindow === 'searchApp' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Search Engine 97" onClose={() => handleWindowClose('searchApp')}>
              <div className="flex flex-col gap-3 w-80 md:w-[500px]">
                <div className="text-xs text-black border-b-2 border-win-border-dark pb-2 leading-relaxed">
                  Welcome to the World Wide Web search directory. Enter a search query below to scan 
                  our extensive index of internet entries. Results will populate instantly.
                </div>
                <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={handleSearchSubmit} />
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 6: Web Directory 97 */}
        {windows.webDirectory && (
          <div 
            onClick={() => handleFocus('webDirectory')}
            className={`absolute right-[4%] md:right-[8%] top-[5%] ${activeWindow === 'webDirectory' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Web Directory 97" onClose={() => handleWindowClose('webDirectory')}>
              <div className="flex flex-col gap-3 w-80 md:w-[420px] font-win text-black">
                <div className="text-xs text-black border-b-2 border-win-border-dark pb-2 leading-relaxed">
                  Browse the internet by category. Select a topic to automatically search the database.
                </div>
                
                {/* Categories tree */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {[
                    {
                      name: 'Arts & Humanities',
                      subcategories: ['Literature', 'Photography', 'Design']
                    },
                    {
                      name: 'Business & Economy',
                      subcategories: ['Companies', 'Investments', 'Jobs']
                    },
                    {
                      name: 'Computers & Internet',
                      subcategories: ['Vite', 'React', 'Java', 'Software', 'Games']
                    },
                    {
                      name: 'Education',
                      subcategories: ['Universities', 'K-12', 'Libraries']
                    },
                    {
                      name: 'Entertainment',
                      subcategories: ['Movies', 'Music', 'Humor', 'TV']
                    },
                    {
                      name: 'Government',
                      subcategories: ['Military', 'Law', 'Politics']
                    },
                    {
                      name: 'Health & Medicine',
                      subcategories: ['Fitness', 'Diseases', 'Medicine']
                    },
                    {
                      name: 'News & Media',
                      subcategories: ['Newspapers', 'Radio', 'TV News']
                    },
                    {
                      name: 'Recreation & Sports',
                      subcategories: ['Travel', 'Autos', 'Sports']
                    },
                    {
                      name: 'Science',
                      subcategories: ['Biology', 'Chemistry', 'Astronomy', 'Physics']
                    },
                    {
                      name: 'Society & Culture',
                      subcategories: ['History', 'Environment', 'Religion']
                    }
                  ].map((cat, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-win-navy">
                        <span>📁</span>
                        <span 
                          className="hover:underline cursor-pointer"
                          onClick={() => triggerSearch(cat.name)}
                        >
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-1 gap-y-0.5 pl-5 text-[10px] text-black">
                        {cat.subcategories.map((sub, sIdx) => (
                          <React.Fragment key={sIdx}>
                            {sIdx > 0 && <span className="text-win-border-dark select-none">|</span>}
                            <span 
                              onClick={() => triggerSearch(sub)}
                              className="text-win-blue hover:underline cursor-pointer font-semibold"
                            >
                              {sub}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </WinWindow>
          </div>
        )}

        {/* WINDOW 7: Dial-Up Connection */}
        {windows.dialUp && (
          <div 
            onClick={() => handleFocus('dialUp')}
            className={`absolute left-[15%] md:left-[25%] top-[15%] ${activeWindow === 'dialUp' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Dial-Up Networking" onClose={() => handleWindowClose('dialUp')}>
              <div className="flex flex-col gap-3 w-80 md:w-[360px] font-win text-black">
                {dialState === 'idle' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-center border-b border-win-border-dark pb-2">
                      <span className="text-4xl">🌐</span>
                      <div className="text-xs">
                        <span className="font-bold">Connect to Dial-Up Server</span>
                        <p className="text-[10px] text-win-border-dark">Select Connect to link this machine to the net.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="w-24 text-right pr-2">User name:</label>
                        <input 
                          type="text" 
                          defaultValue="retro_surfer" 
                          className="win95-inset px-2 py-0.5 flex-1 focus:outline-none border border-win-border-dark bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="w-24 text-right pr-2">Password:</label>
                        <input 
                          type="password" 
                          defaultValue="password123" 
                          className="win95-inset px-2 py-0.5 flex-1 focus:outline-none border border-win-border-dark bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="w-24 text-right pr-2">Phone number:</label>
                        <input 
                          type="text" 
                          defaultValue="1-800-472-8438" 
                          className="win95-inset px-2 py-0.5 flex-1 focus:outline-none border border-win-border-dark bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="w-24 text-right pr-2">Device:</label>
                        <span className="flex-1 text-[11px] font-semibold text-win-border-dark bg-win-gray border border-win-border-dark px-2 py-0.5 win95-inset">
                          Modem 28.8K on COM1
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                      <button 
                        type="button"
                        onClick={() => setDialState('initializing')}
                        className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1.5 hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Connect
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleWindowClose('dialUp')}
                        className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1.5 hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {dialState !== 'idle' && dialState !== 'connected' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-center">
                      <span className="text-3xl animate-pulse-glow">🔌</span>
                      <div className="text-xs">
                        <span className="font-bold">Connecting to Internet</span>
                        <p className="text-[10px] text-win-border-dark">Status: {
                          dialState === 'initializing' ? 'Initializing modem...' :
                          dialState === 'dialing' ? 'Dialing 1-800-472-8438...' :
                          dialState === 'answering' ? 'Waiting for carrier response...' :
                          dialState === 'negotiating' ? 'Negotiating protocol link...' :
                          'Verifying security credentials...'
                        }</p>
                      </div>
                    </div>

                    {/* Win95 classic progress bar */}
                    <div className="win95-inset bg-win-gray p-0.5 flex gap-0.5 h-6 w-full mt-2">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-full flex-1 ${
                            i < Math.floor(dialProgress / 6.6) ? 'bg-win-navy' : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Console log of AT commands */}
                    <div className="win95-inset bg-black p-2 text-green-500 font-win-mono text-[10px] h-28 overflow-y-auto mt-2 border border-win-border-dark select-text leading-tight">
                      {dialLog.map((log, idx) => (
                        <div key={idx} className="break-all">{log}</div>
                      ))}
                    </div>

                    <div className="flex gap-2 justify-end mt-2">
                      <button 
                        type="button"
                        onClick={() => { setDialState('idle'); setDialLog([]); }}
                        className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1.5 hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {dialState === 'connected' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-center border-b border-win-border-dark pb-2">
                      <span className="text-3xl text-green-600">🖧</span>
                      <div className="text-xs">
                        <span className="font-bold text-win-navy">Connection Established!</span>
                        <p className="text-[10px] text-win-border-dark">You are now browsing at optimal speeds.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1">
                      <div>
                        <span className="font-bold">Speed:</span> 28,800 bps
                      </div>
                      <div>
                        <span className="font-bold">Duration:</span> {formatDuration(connectedTime)}
                      </div>
                      <div>
                        <span className="font-bold">Bytes Sent:</span> {bytesSent.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-bold">Bytes Recv:</span> {bytesReceived.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                      <button 
                        type="button"
                        onClick={() => { setDialState('idle'); setDialLog([]); }}
                        className="win95-outset bg-win-navy text-white text-xs font-bold px-4 py-1.5 hover:bg-win-blue"
                      >
                        Disconnect
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleWindowClose('dialUp')}
                        className="win95-outset bg-win-gray text-black text-xs font-bold px-4 py-1.5 hover:bg-[#d0d0d0]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
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
              <div className="flex flex-col gap-3 w-80 md:w-120 text-black">
                <div className="win95-inset bg-white p-2 font-win-mono text-[11px] h-48 overflow-y-auto leading-relaxed border-2 border-win-border-dark">
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
              <div className="flex flex-col gap-4 w-80 md:w-100 font-win text-black">
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
              <div className="flex flex-col gap-3 w-80 md:w-110 text-black">
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
              <div className="flex flex-col gap-4 w-72 md:w-80 font-win text-center items-center justify-center py-4 text-black">
                <span className="text-4xl select-none">🗑️</span>
                <div className="text-xs">
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

        {/* WINDOW 8: Cache Monitor */}
        {windows.cacheMonitor && (
          <div 
            onClick={() => handleFocus('cacheMonitor')}
            className={`absolute left-[10%] md:left-[35%] top-[45%] ${activeWindow === 'cacheMonitor' ? 'z-30' : 'z-20'}`}
          >
            <WinWindow title="Consistent Cache Monitor" onClose={() => handleWindowClose('cacheMonitor')}>
              <CacheMonitor stats={cacheStats} />
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
            {windows.webDirectory && (
              <button 
                onClick={() => handleFocus('webDirectory')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'webDirectory' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                🗂️ Directory
              </button>
            )}
            {windows.dialUp && (
              <button 
                onClick={() => handleFocus('dialUp')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'dialUp' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                🌐 Dial-Up
              </button>
            )}
            {windows.cacheMonitor && (
              <button 
                onClick={() => handleFocus('cacheMonitor')}
                className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold h-7 truncate max-w-28 ${
                  activeWindow === 'cacheMonitor' 
                    ? 'win95-inset bg-[#e0e0e0] translate-x-[0.5px] translate-y-[0.5px] border-[#808080]' 
                    : 'win95-outset bg-win-gray'
                }`}
              >
                ⭕ Cache Ring
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
          {/* Dial-Up Connection Status Tray Icon */}
          <div 
            onClick={() => handleWindowOpen('dialUp')}
            title={dialState === 'connected' ? 'Dial-Up Connection: Connected' : 'Dial-Up Connection: Disconnected'}
            className="win95-inset px-1.5 py-0.5 bg-win-gray text-black font-win text-[10px] select-none h-6 flex items-center gap-1 border-[#808080] cursor-pointer"
          >
            {dialState === 'connected' ? (
              <span className="flex items-center gap-1">
                <span className="animate-blink text-green-600 font-bold">🖧</span>
                <span className="text-[9px] font-bold">28.8K</span>
              </span>
            ) : dialState !== 'idle' ? (
              <span className="flex items-center gap-1 text-[#808080]">
                <span className="animate-blink text-yellow-500 font-bold">🖧</span>
                <span className="text-[9px]">DIAL</span>
              </span>
            ) : (
              <span className="text-[#808080] opacity-50 font-bold">🖧</span>
            )}
          </div>

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
