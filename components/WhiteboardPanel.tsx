import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import type { View, Whiteboard, Toast } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

// Debounce helper function
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeout: number;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), delay);
    };
};

interface WhiteboardPanelProps {
  whiteboards: Whiteboard[];
  updateWhiteboards: (whiteboards: Whiteboard[]) => void;
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({ whiteboards, updateWhiteboards, setView, addToast }) => {
    const [activeBoard, setActiveBoard] = useState<Whiteboard | null>(null);
    const [boardToDelete, setBoardToDelete] = useState<Whiteboard | null>(null);

    const handleCreateBoard = () => {
        const newBoard: Whiteboard = {
            id: Date.now(),
            name: `Whiteboard ${whiteboards.length + 1}`,
            data: null,
            updatedAt: new Date().toISOString(),
        };
        updateWhiteboards([newBoard, ...whiteboards]);
        setActiveBoard(newBoard);
    };

    const confirmDeleteBoard = () => {
        if (!boardToDelete) return;
        updateWhiteboards(whiteboards.filter(w => w.id !== boardToDelete.id));
        setBoardToDelete(null);
        addToast({ message: `"${boardToDelete.name}" deleted.`, type: 'info' });
    };

    const handleUpdateBoard = (updatedBoard: Whiteboard) => {
        const newWhiteboards = whiteboards.map(w => w.id === updatedBoard.id ? updatedBoard : w);
        updateWhiteboards(newWhiteboards);
    };

    if (activeBoard) {
        return <WhiteboardCanvas board={activeBoard} onUpdate={handleUpdateBoard} onBack={() => setActiveBoard(null)} />;
    }

    return (
        <>
            <ConfirmationDialog 
                isOpen={!!boardToDelete}
                onClose={() => setBoardToDelete(null)}
                onConfirm={confirmDeleteBoard}
                title="Delete Whiteboard"
                message={`Are you sure you want to delete "${boardToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-10">
                <div className="max-w-5xl mx-auto">
                    <BackToSuiteHeader
                        setView={setView}
                        title="Whiteboard"
                        description="A blank canvas for your ideas. Create and manage multiple whiteboards."
                    />
                    <div className="mb-6">
                         <button onClick={handleCreateBoard} className="bg-[var(--primary-500)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-base">add</span> New Whiteboard
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {whiteboards.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((board, index) => (
                             <div 
                                key={board.id} 
                                className="liquid-glass-light rounded-xl shadow-lg hover:shadow-[var(--primary-shadow)] hover:-translate-y-1 transition-all duration-300 group relative p-4 flex flex-col animate-grid-item-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <h3 className="font-bold text-white mb-2 truncate">{board.name}</h3>
                                <p className="text-xs text-slate-400">Last updated: {new Date(board.updatedAt).toLocaleDateString()}</p>
                                <div className="flex-1 my-3 bg-black/20 rounded-md flex items-center justify-center">
                                    {board.data ? <img src={board.data} alt="Thumbnail" className="max-w-full max-h-24" /> : <span className="material-symbols-outlined text-4xl text-slate-500">draw</span>}
                                </div>
                                <button onClick={() => setActiveBoard(board)} className="w-full bg-white/10 text-white font-bold py-2 rounded-lg hover:bg-white/20 transition-colors button-active">Open</button>
                                <button onClick={(e) => { e.stopPropagation(); setBoardToDelete(board); }} className="absolute top-2 right-2 w-7 h-7 bg-black/30 rounded-full text-slate-400 hover:bg-red-500/50 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all button-active" title="Delete whiteboard">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                             </div>
                        ))}
                    </div>
                    {whiteboards.length === 0 && <p className="text-center text-slate-400 mt-10">No whiteboards yet. Create one to get started!</p>}
                </div>
            </div>
        </>
    )
};


// --- Whiteboard Canvas Component ---

interface WhiteboardCanvasProps {
    board: Whiteboard;
    onUpdate: (board: Whiteboard) => void;
    onBack: () => void;
}

const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ board, onUpdate, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [boardName, setBoardName] = useState(board.name);

  // Debounced update function
  const debouncedUpdate = useCallback(debounce((data: string | null) => {
    onUpdate({ ...board, data, updatedAt: new Date().toISOString() });
  }, 1000), [board, onUpdate]);

  const setCanvasDimensions = useCallback((restoringImage: string | null = board.data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (container) {
      const { clientWidth, clientHeight } = container;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx?.drawImage(canvas, 0, 0);

          canvas.width = clientWidth;
          canvas.height = clientHeight;
          contextRef.current?.drawImage(tempCanvas, 0, 0);
      }
      
      if (restoringImage) {
          const img = new Image();
          img.src = restoringImage;
          img.onload = () => {
            contextRef.current?.clearRect(0, 0, canvas.width, canvas.height);
            contextRef.current?.drawImage(img, 0, 0);
          };
      }
    }
  }, [board.data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    contextRef.current = canvas.getContext('2d', { willReadFrequently: true });
    setCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => setCanvasDimensions(null));
    const parentElement = canvas.parentElement;
    if(parentElement) resizeObserver.observe(parentElement);

    return () => {
      if(parentElement) resizeObserver.unobserve(parentElement);
    };
  }, [setCanvasDimensions]);

  useEffect(() => {
    const context = contextRef.current;
    if(context) {
        context.strokeStyle = brushColor;
        context.globalCompositeOperation = 'source-over';
        setIsErasing(false);
    }
  }, [brushColor]);

  useEffect(() => {
    const context = contextRef.current;
    if(context) {
        context.lineWidth = brushSize;
    }
  }, [brushSize]);

  useEffect(() => {
    const context = contextRef.current;
    if (context) {
      context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
      if(isErasing) context.lineWidth = brushSize * 2; // Make eraser bigger
      else context.lineWidth = brushSize;
    }
  }, [isErasing, brushSize]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): {x: number, y: number} | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    // FIX: Use nativeEvent for both touch and mouse events to get consistent clientX/clientY properties.
    const event = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0] : e.nativeEvent;
    if (!event) return null;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords || !contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if(!isDrawing) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        debouncedUpdate(canvas.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getCoords(e);
    if (!coords || !contextRef.current) return;
    contextRef.current.lineTo(coords.x, coords.y);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        debouncedUpdate(null);
    }
  }

  const handleNameBlur = () => {
    if(board.name !== boardName.trim() && boardName.trim() !== '') {
        onUpdate({ ...board, name: boardName.trim(), updatedAt: new Date().toISOString() });
    } else {
        setBoardName(board.name); // Revert if empty
    }
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <div className="flex-shrink-0 mb-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
             <button onClick={onBack} className="text-sm text-[var(--primary-400)] hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                All Whiteboards
            </button>
            <input 
                type="text" 
                value={boardName} 
                onChange={e => setBoardName(e.target.value)}
                onBlur={handleNameBlur}
                className="bg-transparent text-xl font-bold text-white border-b-2 border-transparent focus:border-[var(--primary-400)] focus:outline-none transition"
            />
        </div>
        <div className="liquid-glass p-2 rounded-xl flex items-center justify-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-base">palette</span>
                  <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="bg-transparent w-8 h-8"/>
              </label>
              <label className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-base">line_weight</span>
                  <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
              </label>
          </div>
           <div className="flex items-center gap-2">
              <button onClick={() => setIsErasing(!isErasing)} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${isErasing ? 'bg-[var(--primary-500)] text-white' : 'bg-black/30'}`}>
                  <span className="material-symbols-outlined text-base">ink_eraser</span>{isErasing ? 'Erasing' : 'Eraser'}
              </button>
              <button onClick={clearCanvas} className="px-4 py-2 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">delete</span>Clear
              </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 liquid-glass rounded-xl overflow-hidden touch-none -mx-4 -mb-4 md:-mx-8 md:-mb-8">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
          className="cursor-crosshair w-full h-full"
        />
      </div>
    </div>
  );
};

export default WhiteboardPanel;