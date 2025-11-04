import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateKnowledgeGraph } from '../services/geminiService';
import { LoadingIcon } from './icons/LoadingIcon';
import type { View, Toast, Note, GraphNode, GraphEdge, UserUsage } from '../types';
import { ADVANCED_USAGE_LIMIT } from './constants';

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

interface KnowledgeGraphPanelProps {
  notes: Note[];
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  usage: UserUsage;
  updateUsage: (category: 'standard' | 'advanced') => void;
}

const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({ notes, setView, addToast, usage, updateUsage }) => {
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[], edges: GraphEdge[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const graphContainerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [nodePositions, setNodePositions] = useState<Record<string, {x: number, y: number}>>({});
    const [draggingNode, setDraggingNode] = useState<{id: string, offset: {x: number, y: number}} | null>(null);

    const usesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    useEffect(() => {
        if (notes.length > 0 && !selectedNoteId) {
            setSelectedNoteId(notes[0].id);
        }
    }, [notes, selectedNoteId]);

    useEffect(() => {
        if (graphData?.nodes) {
            // Simple physics simulation for initial layout
            const newPositions: Record<string, {x: number, y: number}> = {};
            const { width, height } = graphContainerRef.current?.getBoundingClientRect() || {width: 500, height: 500};
            graphData.nodes.forEach(node => {
                newPositions[node.id] = {
                    x: Math.random() * (width - 100) + 50,
                    y: Math.random() * (height - 100) + 50
                };
            });
            setNodePositions(newPositions);
        }
    }, [graphData]);

    const handleGenerate = async () => {
        const selectedNote = notes.find(n => n.id === selectedNoteId);
        if (!selectedNote) {
            addToast({ message: 'Please select a note first.', type: 'info' });
            return;
        }
        if (usesLeft <= 0) {
            addToast({ message: 'Daily limit for Advanced AI tools reached.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setGraphData(null);

        try {
            const content = stripHtml(selectedNote.content);
            if(content.length < 50) {
                throw new Error("Note content is too short to generate a meaningful graph.");
            }
            const data = await generateKnowledgeGraph(content);
            setGraphData(data);
            updateUsage('advanced');
            addToast({ message: 'Knowledge graph generated!', type: 'success' });
        } catch(err: any) {
            setError(err.message || 'An unexpected error occurred.');
            addToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        const nodePos = nodePositions[nodeId];
        setDraggingNode({
            id: nodeId,
            offset: { x: e.clientX - nodePos.x, y: e.clientY - nodePos.y }
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingNode) return;
        setNodePositions(prev => ({
            ...prev,
            [draggingNode.id]: {
                x: e.clientX - draggingNode.offset.x,
                y: e.clientY - draggingNode.offset.y
            }
        }));
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    const selectedNote = notes.find(n => n.id === selectedNoteId);
    const canGenerate = !isLoading && selectedNoteId && usesLeft > 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-10">
            <header className="flex-shrink-0 mb-8">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Graph Visualizer</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                    Transform your notes into an interactive mind map to discover connections.
                </p>
            </header>

            <div className="liquid-glass-advanced p-4 mb-6 flex-shrink-0 flex items-center gap-4">
                <select 
                    value={selectedNoteId || ''} 
                    onChange={e => setSelectedNoteId(Number(e.target.value))}
                    className="flex-1 p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition"
                >
                    {notes.length === 0 && <option>No notes available</option>}
                    {notes.map(note => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <div className="text-sm text-slate-400">
                    {usesLeft > 0 ? (
                        <span><span className="font-semibold text-white">{usesLeft}</span> / {ADVANCED_USAGE_LIMIT} uses left today</span>
                    ) : (
                        <span className="font-semibold text-red-400">Daily limit reached</span>
                    )}
                </div>
                <button onClick={handleGenerate} disabled={!canGenerate} className="bg-[var(--primary-500)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] disabled:cursor-not-allowed transition-colors flex items-center justify-center button-active">
                    {isLoading ? <><i className="fas fa-brain mr-2 animate-thinking text-white"></i> Analyzing...</> : <><i className="fas fa-project-diagram mr-2"></i>Generate Graph</>}
                </button>
            </div>
            
            <div className="flex-1 liquid-glass-advanced relative overflow-hidden" ref={graphContainerRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-20">
                        <LoadingIcon />
                        <p className="text-sm text-[var(--text-secondary)] mt-2">AI is analyzing your note and building the graph...</p>
                    </div>
                )}
                {error && <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500">{error}</div>}
                
                {!isLoading && !graphData && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-[var(--text-tertiary)] text-center">
                        <i className="fas fa-sitemap text-5xl mb-4"></i>
                        <p className="font-semibold">Your knowledge graph will appear here.</p>
                        <p className="text-sm max-w-xs">Select a note and click "Generate Graph" to visualize its concepts.</p>
                    </div>
                )}
                
                {graphData && (
                     <>
                        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                            {graphData.edges.map((edge, i) => {
                                const fromPos = nodePositions[edge.from];
                                const toPos = nodePositions[edge.to];
                                if (!fromPos || !toPos) return null;
                                return (
                                    <g key={i}>
                                        <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} stroke="var(--text-tertiary)" strokeWidth="1" />
                                    </g>
                                )
                            })}
                        </svg>
                        {graphData.nodes.map(node => (
                             <div 
                                key={node.id}
                                ref={(el) => {
                                    if (el) nodeRefs.current[node.id] = el;
                                }}
                                className="graph-node"
                                style={{
                                    left: nodePositions[node.id]?.x || 0,
                                    top: nodePositions[node.id]?.y || 0,
                                    transform: `translate(-50%, -50%)`,
                                    borderColor: `var(--primary-${node.group === 1 ? '500' : '300'})`
                                }}
                                onMouseDown={e => handleMouseDown(e, node.id)}
                            >
                                {node.label}
                             </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default KnowledgeGraphPanel;