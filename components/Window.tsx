
import React from 'react';
import { WindowState } from '../types';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
}

const Window: React.FC<WindowProps> = ({ window, children, onClose, onFocus }) => {
  if (!window.isOpen) return null;

  return (
    <div
      onClick={() => onFocus(window.id)}
      className="absolute bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
      style={{
        left: window.x,
        top: window.y,
        width: window.width,
        height: window.height,
        zIndex: window.zIndex,
      }}
    >
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 cursor-default select-none">
        <span className="text-slate-300 text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500"></div>
          {window.title}
        </span>
        <div className="flex gap-2">
          <button className="w-3 h-3 rounded-full bg-yellow-500/50 hover:bg-yellow-500 transition-colors"></button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(window.id); }}
            className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors"
          ></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-950/50 relative">
        {children}
      </div>
    </div>
  );
};

export default Window;
