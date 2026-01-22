
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Position, WindowState, CursorAction, ActionType } from './types';
import GhostCursor from './components/GhostCursor';
import Window from './components/Window';
import { getNextAutonomousActions } from './services/gemini';

const App: React.FC = () => {
  const [cursorPos, setCursorPos] = useState<Position>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isClicking, setIsClicking] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [logs, setLogs] = useState<string[]>(['System ready.', 'Waiting for instructions...']);
  
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'notepad', title: 'Notepad', x: 50, y: 50, width: 300, height: 200, zIndex: 1, isOpen: true },
    { id: 'whiteboard', title: 'Whiteboard', x: 400, y: 100, width: 400, height: 400, zIndex: 2, isOpen: true },
    { id: 'files', title: 'File Explorer', x: 100, y: 350, width: 250, height: 180, zIndex: 3, isOpen: true },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const whiteboardRef = useRef<HTMLCanvasElement>(null);
  const actionQueue = useRef<CursorAction[]>([]);
  const isExecuting = useRef(false);
  const wanderInterval = useRef<number | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  // Pointer Lock management
  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      setIsCaptured(locked);
      if (locked) {
        addLog("Physical mouse captured.");
        setIsAutoPilot(true);
      } else {
        addLog("Mouse released.");
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  const requestCapture = () => {
    containerRef.current?.requestPointerLock();
  };

  // Smooth movement engine
  const moveTo = async (target: Position, duration: number = 1000) => {
    const start = { ...cursorPos };
    const startTime = performance.now();

    return new Promise<void>(resolve => {
      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Custom quintic ease-out for organic feel
        const ease = 1 - Math.pow(1 - progress, 5);

        const nextPos = {
          x: start.x + (target.x - start.x) * ease,
          y: start.y + (target.y - start.y) * ease,
        };
        
        setCursorPos(nextPos);

        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });
  };

  // Wander logic: keeps the cursor moving while AI is "thinking"
  const startWandering = () => {
    if (wanderInterval.current) return;
    wanderInterval.current = window.setInterval(async () => {
      if (!isExecuting.current && actionQueue.current.length === 0 && isAutoPilot) {
        const margin = 100;
        const randomTarget = {
          x: margin + Math.random() * (window.innerWidth - margin * 2),
          y: margin + Math.random() * (window.innerHeight - margin * 2)
        };
        setStatus('Wandering...');
        await moveTo(randomTarget, 2000 + Math.random() * 2000);
      }
    }, 100);
  };

  const stopWandering = () => {
    if (wanderInterval.current) {
      clearInterval(wanderInterval.current);
      wanderInterval.current = null;
    }
  };

  useEffect(() => {
    if (isAutoPilot) startWandering();
    else stopWandering();
    return stopWandering;
  }, [isAutoPilot]);

  const executeAction = async (action: CursorAction) => {
    isExecuting.current = true;
    setStatus(`${action.type}${action.target ? ': ' + action.target : ''}`);
    
    if (action.type === ActionType.MOVE || (action.type === ActionType.CLICK && action.position)) {
      const targetPos = action.position || { x: 500, y: 500 };
      
      if (action.target) {
        const win = windows.find(w => w.id === action.target || w.title === action.target);
        if (win) {
          targetPos.x = win.x + win.width / 2 + (Math.random() * 20 - 10);
          targetPos.y = win.y + win.height / 2 + (Math.random() * 20 - 10);
        }
      }

      await moveTo(targetPos, 1200);

      if (action.type === ActionType.CLICK) {
        setIsClicking(true);
        addLog(`Click: ${action.target || 'desktop'}`);
        await new Promise(r => setTimeout(r, 300));
        setIsClicking(false);
      }
    } 
    else if (action.type === ActionType.DRAW && action.path) {
      addLog('Intent: Creative Drawing');
      const win = windows.find(w => w.id === 'whiteboard');
      if (win && whiteboardRef.current) {
        const ctx = whiteboardRef.current.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < action.path.length; i++) {
            const p = action.path[i];
            const absX = win.x + 20 + (p.x * (win.width - 40));
            const absY = win.y + 50 + (p.y * (win.height - 80));

            await moveTo({ x: absX, y: absY }, 150);
            
            const localX = absX - win.x;
            const localY = absY - win.y - 40;
            
            if (i === 0) ctx.beginPath();
            if (i === 0) ctx.moveTo(localX, localY);
            else ctx.lineTo(localX, localY);
            ctx.stroke();
          }
        }
      }
    }
    isExecuting.current = false;
  };

  useEffect(() => {
    if (isAutoPilot && actionQueue.current.length === 0 && !isExecuting.current) {
      const fetchActions = async () => {
        setStatus('Thinking...');
        const newActions = await getNextAutonomousActions(
          windows.filter(w => w.isOpen).map(w => w.title),
          { width: window.innerWidth, height: window.innerHeight }
        );
        actionQueue.current = newActions;
        addLog(`Plan updated: ${newActions.length} instructions.`);
      };
      fetchActions();
    }
  }, [isAutoPilot, windows]);

  useEffect(() => {
    const mainLoop = setInterval(() => {
      if (isAutoPilot && actionQueue.current.length > 0 && !isExecuting.current) {
        const next = actionQueue.current.shift();
        if (next) executeAction(next);
      }
    }, 100);
    return () => clearInterval(mainLoop);
  }, [isAutoPilot, windows]);

  const handleWindowFocus = (id: string) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      zIndex: w.id === id ? 10 : Math.max(1, w.zIndex - 1)
    })));
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: false } : w));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-[#020617] select-none"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

      {windows.map(win => (
        <Window key={win.id} window={win} onClose={closeWindow} onFocus={handleWindowFocus}>
          {win.id === 'whiteboard' && (
            <canvas ref={whiteboardRef} width={win.width} height={win.height - 40} className="w-full h-full bg-[#030712]" />
          )}
          {win.id === 'notepad' && (
            <div className="p-4 text-slate-400 font-mono text-sm leading-relaxed">
              <div className="mb-2 text-violet-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                # GHOST_PROTOCOL_V3
              </div>
              <p>System is currently active.</p>
              <p className="mt-2 text-xs text-slate-600">The cursor will now navigate autonomously through the virtual desktop. Gemini is calculating the next coordinates...</p>
            </div>
          )}
          {win.id === 'files' && (
            <div className="p-4 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Data_{i}.bin</span>
                </div>
              ))}
            </div>
          )}
        </Window>
      ))}

      {/* Control Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setIsAutoPilot(!isAutoPilot)}
          className={`h-12 px-6 rounded-xl font-bold transition-all flex items-center gap-3 ${
            isAutoPilot ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isAutoPilot ? (
            <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span> Abort AI</>
          ) : (
            <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg> Initiate Ghost</>
          )}
        </button>

        <button
          onClick={requestCapture}
          className={`h-12 px-6 rounded-xl font-bold transition-all flex items-center gap-3 border ${
            isCaptured ? 'bg-amber-500 text-black border-amber-600' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
          }`}
        >
          {isCaptured ? 'Locked to Hardware' : 'Sync Hardware Cursor'}
        </button>

        <div className="w-48 px-4 py-2 bg-black/40 rounded-xl border border-white/5 ml-2">
          <div className="text-[9px] uppercase tracking-tighter text-slate-500 font-black">Active Instruction</div>
          <div className="text-xs text-indigo-300 font-mono truncate">{status}</div>
        </div>
      </div>

      {isCaptured && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/10 px-6 py-2 rounded-full text-[10px] font-black tracking-widest text-indigo-400 z-[1000] animate-pulse">
          HARDWARE CONTROL ACTIVE • ESC TO RELEASE
        </div>
      )}

      {/* Terminal Log */}
      <div className="fixed left-8 top-8 w-64 p-4 bg-black/60 backdrop-blur border border-white/5 rounded-2xl z-[50]">
         <div className="flex items-center gap-2 mb-4">
           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Process Stream</span>
         </div>
         <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className={`text-[11px] font-mono leading-tight ${i === 0 ? 'text-white' : 'text-slate-600 opacity-50'}`}>
                <span className="text-indigo-500 mr-2">&gt;</span>{log}
              </div>
            ))}
         </div>
      </div>

      <GhostCursor position={cursorPos} isClicking={isClicking} status={status} />
    </div>
  );
};

export default App;
