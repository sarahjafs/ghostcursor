
import React, { useEffect, useState } from 'react';
import { Position } from '../types';

interface GhostCursorProps {
  position: Position;
  isClicking: boolean;
  status: string;
}

const GhostCursor: React.FC<GhostCursorProps> = ({ position, isClicking, status }) => {
  const [trail, setTrail] = useState<Position[]>([]);

  useEffect(() => {
    setTrail(prev => [{ ...position }, ...prev].slice(0, 25));
  }, [position]);

  const isWandering = status === 'Wandering...';

  return (
    <>
      {trail.map((p, i) => (
        <div
          key={i}
          className="cursor-trail"
          style={{
            left: p.x,
            top: p.y,
            opacity: (1 - i / 25) * 0.4,
            scale: `${1 - i / 25}`,
            background: i === 0 ? '#6366f1' : 'rgba(99, 102, 241, 0.2)',
            zIndex: 9998 - i
          }}
        />
      ))}
      
      <div
        className={`fixed pointer-events-none z-[9999] transition-transform duration-75`}
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-4px, -4px) scale(${isClicking ? 0.8 : 1})`,
        }}
      >
        {/* Cursor Glow */}
        <div className={`absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl transition-opacity duration-1000 ${isWandering ? 'opacity-20' : 'opacity-60 animate-pulse'}`} />
        
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        >
          <path
            d="M5.65376 12.3822L15.4602 19.2924C16.5719 20.0754 18.1005 19.1246 17.8465 17.7725L15.9392 7.55831C15.7533 6.56157 14.596 6.13117 13.8166 6.77255L5.43384 13.6661C4.6046 14.3496 5.09339 15.6946 6.15579 15.6946H11.0004L5.65376 12.3822Z"
            fill="white"
            stroke="#4f46e5"
            strokeWidth="2"
          />
        </svg>
        
        <div className={`absolute left-8 top-8 bg-indigo-600/90 text-white text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full whitespace-nowrap border border-white/20 backdrop-blur-md transition-all ${status === 'Idle' ? 'opacity-0' : 'opacity-100'}`}>
          {status}
        </div>
      </div>
    </>
  );
};

export default GhostCursor;
