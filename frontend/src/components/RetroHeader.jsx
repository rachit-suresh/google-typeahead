import React from 'react';

export default function RetroHeader() {
  return (
    <div className="w-full flex flex-col mb-6 font-win select-none">
      {/* Yellow/Black construction warning stripes strip */}
      <div className="h-4 w-full bg-construction" />

      {/* Title block */}
      <div className="bg-win-navy text-white p-3 flex flex-col md:flex-row items-center justify-between border-b-4 border-win-border-dark gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-win-heavy text-rainbow tracking-wider uppercase select-none">
            SEARCH 97
          </h1>
          <span className="bg-red-600 text-yellow-300 font-bold px-1.5 py-0.5 text-[10px] uppercase animate-pulse-glow win95-outset border-red-500">
            NEW!
          </span>
        </div>

        {/* Marquee Banner */}
        <div className="flex-1 max-w-xl w-full bg-black border-2 border-win-border-dark text-[#00ff00] p-1 font-win-mono text-xs overflow-hidden h-6 flex items-center">
          {/* Note: Standard marquee works in modern web browsers and fits the raw 90s style */}
          <marquee scrollamount="5">
            +++ WELCOME TO SEARCH ENGINE 97 +++ INDEXING 1,244,495 AOL USER QUERIES +++ POWERED BY JAVA 25 & POSTGRESQL +++ NO TRIES ALLOWED! +++ FAST PREFIX MATCHING +++
          </marquee>
        </div>
      </div>

      {/* Grooved separator line */}
      <div className="hr-groove mt-2" />
    </div>
  );
}
