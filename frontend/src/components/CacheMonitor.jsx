import React from 'react';

export default function CacheMonitor({ stats }) {
  const { hits = 0, misses = 0, dbQueries = 0, nodes = [], keys = {} } = stats || {};

  const totalRequests = hits + misses;
  const hitRatio = totalRequests > 0 ? ((hits / totalRequests) * 100).toFixed(1) : '0.0';

  return (
    <div className="font-win text-black flex flex-col gap-4 w-[420px] select-none">
      {/* Visual Server Nodes Container */}
      <div className="grid grid-cols-3 gap-2 border-b-2 border-win-border-dark pb-3">
        {nodes.map((node, idx) => {
          const nodeKeys = keys[node.name] || [];
          return (
            <div key={idx} className="win95-outset bg-win-gray p-2 flex flex-col items-center gap-1.5 text-center">
              {/* Retro Computer Icon */}
              <div className="text-3xl relative">
                🖥️
                {/* Online/Offline Status Indicator Light */}
                <span 
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black ${
                    node.online ? 'bg-[#00ff00] animate-pulse' : 'bg-red-600'
                  }`}
                  title={node.online ? 'Online' : 'Offline'}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold truncate max-w-[100px]">{node.name}</span>
                <span className="text-[9px] text-win-border-dark font-win-mono">Port: {node.port}</span>
              </div>

              {/* Cached Keys Inset List */}
              <div className="win95-inset bg-white w-full h-24 p-1 overflow-y-auto text-left font-win-mono text-[9px] border border-win-border-dark select-text leading-tight">
                <div className="font-bold border-b border-[#dfdfdf] pb-0.5 mb-1 text-[8px] text-win-navy uppercase select-none">
                  KEYS ({node.keyCount !== undefined ? node.keyCount.toLocaleString() : nodeKeys.length})
                </div>
                {nodeKeys.length === 0 ? (
                  <span className="text-win-border-dark italic select-none">Empty</span>
                ) : (
                  nodeKeys.map((k, kIdx) => (
                    <div key={kIdx} className="truncate text-green-700 font-semibold" title={k}>
                      {k.replace('suggest:', '')}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Left Stats Column */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-[#dfdfdf] pb-1">
            <span className="font-bold">Cache Hits:</span>
            <span className="win95-inset bg-black text-[#00ff00] font-win-mono px-2 py-0.5 text-[10px] min-w-[50px] text-right border border-win-border-dark">
              {hits.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-[#dfdfdf] pb-1">
            <span className="font-bold">Cache Misses:</span>
            <span className="win95-inset bg-black text-yellow-500 font-win-mono px-2 py-0.5 text-[10px] min-w-[50px] text-right border border-win-border-dark">
              {misses.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Stats Column */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-[#dfdfdf] pb-1">
            <span className="font-bold">Hit Ratio:</span>
            <span className="win95-inset bg-black text-cyan-400 font-win-mono px-2 py-0.5 text-[10px] min-w-[50px] text-right border border-win-border-dark">
              {hitRatio}%
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-[#dfdfdf] pb-1">
            <span className="font-bold text-red-700">DB Reads:</span>
            <span className="win95-inset bg-black text-red-600 font-win-mono px-2 py-0.5 text-[10px] min-w-[50px] text-right border border-win-border-dark animate-pulse">
              {dbQueries.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Consistent Hash Ring Summary Info */}
      <div className="win95-inset bg-[#e8e8e8] p-2 text-[10px] leading-relaxed border border-win-border-dark select-text">
        <span className="font-bold text-win-navy">Consistent Hashing Ring:</span>
        <p className="text-[9px] mt-1 text-win-border-deep-dark">
          Keys are mapped to the ring using MD5 hashes. When suggestions are requested, the query prefix is hashed, and routed to the nearest Redis Node clockwise.
          Virtual nodes (100 per physical instance) ensure uniform key distribution.
        </p>
      </div>
    </div>
  );
}
