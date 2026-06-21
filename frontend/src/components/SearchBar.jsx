import React, { useState, useEffect, useRef } from 'react';

export default function SearchBar({ onSearch, query, setQuery }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  // Debouncing API fetch logic
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(() => {
      fetch(`http://localhost:8080/suggest?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error('API error');
          return res.json();
        })
        .then((data) => {
          setSuggestions(data);
          setActiveIdx(-1);
          setShowDropdown(true);
        })
        .catch((err) => {
          console.error(err);
          setSuggestions([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 250); // 250ms debounce delay

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside handler to dismiss dropdown panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        selectSuggestion(suggestions[activeIdx].query);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectSuggestion = (val) => {
    setQuery(val);
    setShowDropdown(false);
    
    // Call the POST /search/submit Node.js API to record/increment query count
    fetch('http://localhost:8081/search/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: val }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to record search');
        return res.json();
      })
      .then(() => {
        onSearch(val);
      })
      .catch((err) => {
        console.error('Error submitting search:', err);
        onSearch(val); // Fallback: still notify parent
      });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setShowDropdown(false);

    // Call the POST /search/submit Node.js API to record/increment query count
    fetch('http://localhost:8081/search/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query.trim() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to record search');
        return res.json();
      })
      .then(() => {
        onSearch(query);
      })
      .catch((err) => {
        console.error('Error submitting search:', err);
        onSearch(query); // Fallback: still notify parent
      });
  };

  return (
    <form onSubmit={handleSubmit} className="font-win" ref={containerRef}>
      <div className="flex flex-col gap-2 relative">
        <label className="text-sm font-bold uppercase tracking-wider text-black select-none">
          Search Query:
        </label>
        
        {/* Input Field box */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type search query here..."
            className="win95-inset px-4 py-2.5 w-full text-lg text-black focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-[-3px]"
          />
          {isLoading && (
            <span className="absolute right-4 text-xs font-win-mono text-win-border-dark animate-blink">
              LOADING...
            </span>
          )}
        </div>

        {/* Suggestion Dropdown panel */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="win95-inset absolute left-0 right-0 top-[72px] z-50 max-h-60 overflow-y-auto p-0.5 select-none border-2 border-win-border-dark">
            {suggestions.map((item, idx) => {
              const isHighlighted = idx === activeIdx;
              const isOdd = idx % 2 !== 0;
              // Check if query is trending (at least 5 searches today and today represents >= 30% of month's searches)
              const isTrending = item.dayCount > 5 && item.dayCount >= item.monthCount * 0.3;
              
              return (
                <li
                  key={idx}
                  onClick={() => selectSuggestion(item.query)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between font-win-mono ${
                    isHighlighted 
                      ? 'bg-win-navy text-white' 
                      : isOdd 
                        ? 'bg-[#E8E8E8] text-black' 
                        : 'bg-white text-black'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-4">
                    <span className="truncate">{item.query}</span>
                    {isTrending && (
                      <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 font-bold animate-pulse rounded select-none uppercase tracking-wider">
                        🔥 TRENDING
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${isHighlighted ? 'text-yellow-200' : 'text-win-border-dark'}`}>
                    ({Math.round(item.score).toLocaleString()})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Outset buttons */}
      <div className="flex gap-3 justify-end mt-6">
        <button
          type="submit"
          className="win95-outset bg-win-gray text-black text-sm font-bold px-6 py-2.5 uppercase hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => { setQuery(''); setSuggestions([]); }}
          className="win95-outset bg-win-gray text-black text-sm font-bold px-6 py-2.5 uppercase hover:bg-[#d0d0d0] active:[border-color:#808080_#fff_#fff_#808080] active:translate-x-[1px] active:translate-y-[1px] focus:outline-dotted focus:outline-2 focus:outline-black focus:outline-offset-1"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
