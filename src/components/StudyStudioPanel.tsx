import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LoadingIcon } from './icons/LoadingIcon';
import { STANDARD_USAGE_LIMIT, ADVANCED_USAGE_LIMIT } from './constants';
import * as gemini from '../services/geminiService';
import type { View, Toast, UserUsage, Flashcard, QuizQuestion, QuestionType, StudySet, Material, Explainer, EssayGrade, GeneratedQuiz, ChatMessage, CalEvent, AuthUser } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import AIStudyPlanner from './AIStudyPlanner';
import QuizTaker from './QuizTaker';
import { saveFile, getFile, deleteFile } from '../services/fileCache';
import { uploadMaterialFile, getMaterialDownloadUrl, deleteMaterialFile } from '../services/firebase';


// --- PROPS INTERFACE ---
interface FocusStudioPanelProps {
  user: AuthUser;
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  usage: UserUsage;
  updateUsage: (category: 'standard' | 'advanced' | 'assistant') => void;
  studySets: StudySet[];
  updateStudySets: (sets: StudySet[]) => void;
  events: CalEvent[];
  updateEvents: (events: CalEvent[]) => void;
}

// --- UTILITY FUNCTIONS ---
const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.split(':')[1].split(';')[0];
      const data = result.split(',')[1];
      resolve({ mimeType, data });
    };
    reader.onerror = (error) => reject(error);
  });

// --- MAIN COMPONENT ---
const FocusStudioPanel: React.FC<FocusStudioPanelProps> = ({ user, addToast, usage, updateUsage, studySets, updateStudySets, events, updateEvents }) => {
    const [activeView, setActiveView] = useState<'hub' | 'planner' | 'set_detail'>('hub');
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
    const [isCreatingSet, setIsCreatingSet] = useState(false);
    const [newSetName, setNewSetName] = useState("");
    const [setToDelete, setSetToDelete] = useState<StudySet | null>(null);
    
    const selectedSet = useMemo(() => studySets.find(s => s.id === selectedSetId), [studySets, selectedSetId]);
    const canCreateSet = studySets.length < 5; // Example limit increased

    const handleCreateSet = () => {
        if (!newSetName.trim() || !canCreateSet) return;
        const newSet: StudySet = {
            id: Date.now(),
            name: newSetName.trim(),
            materials: [],
            flashcards: [],
            quizzes: [],
            explainers: [],
            essayGrades: [],
            tutorHistory: [],
        };
        updateStudySets([newSet, ...studySets]);
        setNewSetName("");
        setIsCreatingSet(false);
        addToast({ message: `Study set "${newSet.name}" created!`, type: 'success' });
    };

    const handleDeleteSet = async () => {
        if (!setToDelete) return;
        try {
            // Clean up cached files and storage files before deleting the set
            for (const material of setToDelete.materials) {
                await deleteMaterialFile(material.storagePath);
                await deleteFile(material.id);
            }
            updateStudySets(studySets.filter(s => s.id !== setToDelete.id));
            if (selectedSetId === setToDelete.id) {
                setSelectedSetId(null);
            }
            addToast({ message: `Study set "${setToDelete.name}" deleted.`, type: 'info' });
        } catch (e: any) {
            addToast({ message: e.message || "Error cleaning up materials.", type: 'error' });
        } finally {
            setSetToDelete(null);
        }
    };

    const handleUpdateSelectedSet = (updatedSet: StudySet) => {
        const newSets = studySets.map(s => s.id === updatedSet.id ? updatedSet : s);
        updateStudySets(newSets);
    };

    const handleSelectSet = (id: number) => {
        setSelectedSetId(id);
        setActiveView('set_detail');
    };

    if (activeView === 'planner') {
        return <AIStudyPlanner 
                    onBack={() => setActiveView('hub')} 
                    studySets={studySets}
                    events={events}
                    updateEvents={updateEvents}
                    usage={usage}
                    updateUsage={updateUsage}
                    addToast={addToast}
                />;
    }

    if (activeView === 'set_detail' && selectedSet) {
        return <StudySetDetailView 
                    user={user}
                    studySet={selectedSet} 
                    onUpdateSet={handleUpdateSelectedSet}
                    onBack={() => setActiveView('hub')}
                    usage={usage}
                    updateUsage={updateUsage}
                    addToast={addToast}
                />;
    }

    return (
        <>
            <ConfirmationDialog
                isOpen={!!setToDelete}
                onClose={() => setSetToDelete(null)}
                onConfirm={handleDeleteSet}
                title="Delete Study Set"
                message={`Are you sure you want to permanently delete "${setToDelete?.name}"? All associated materials, flashcards, and quizzes will be lost.`}
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-10">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8">
                        <h2 className="text-2xl md:text-3xl text-[var(--text-secondary)] animate-text-reveal">
                            Welcome to the lab.
                        </h2>
                        <h1 className="focus-agenda-title text-5xl md:text-6xl animate-text-reveal" style={{animationDelay: '100ms'}}>Focus Studio</h1>
                    </header>
                    
                    {/* AI Study Planner Card */}
                    <div onClick={() => setActiveView('planner')} className="liquid-glass-advanced glow-on-hover p-6 rounded-2xl cursor-pointer group animate-grid-item-in aurora-border flex flex-col md:flex-row items-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--primary-shadow-lg)]">
                            <span className="material-symbols-outlined text-5xl text-white">date_range</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">AI Study Planner</h3>
                            <p className="text-slate-300 mt-1">Let Focus.AI analyze your calendar and materials to craft the perfect study schedule for you.</p>
                        </div>
                         <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-white transition-colors ml-auto hidden md:block">arrow_forward</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-4">Your Study Sets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {studySets.map((set, index) => (
                            <div 
                                key={set.id}
                                className="liquid-glass-advanced glow-on-hover p-6 rounded-2xl group animate-grid-item-in relative flex flex-col"
                                style={{ animationDelay: `${100 + index * 50}ms` }}
                            >
                                <h3 className="text-xl font-bold text-white truncate pr-8">{set.name}</h3>
                                <p className="text-sm text-slate-300 mt-1">{set.materials.length} materials</p>
                                <div className="border-t border-[var(--glass-border)] my-4"></div>
                                <div className="grid grid-cols-3 gap-2 text-slate-400 text-xs text-center">
                                    <div className="liquid-glass-inset p-2 rounded-md flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-sm">description</span> {set.materials.length} Materials</div>
                                    <div className="liquid-glass-inset p-2 rounded-md flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-sm">style</span> {set.flashcards.length} Sets</div>
                                    <div className="liquid-glass-inset p-2 rounded-md flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-sm">quiz</span> {set.quizzes.length} Quizzes</div>
                                </div>
                                <div className="flex-1"></div>
                                <button 
                                    onClick={() => handleSelectSet(set.id)}
                                    className="w-full mt-6 bg-[var(--primary-500)] text-white font-bold py-2 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active"
                                >
                                    Open Set
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSetToDelete(set); }}
                                    className="absolute top-3 right-3 w-8 h-8 bg-black/20 rounded-full text-slate-400 hover:bg-red-500/50 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all button-active"
                                    title="Delete study set"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        ))}
                        <div 
                            onClick={() => canCreateSet && setIsCreatingSet(true)}
                            className={`liquid-glass-light glow-on-hover p-6 rounded-xl border-2 border-dashed  flex flex-col items-center justify-center text-center min-h-[260px] transition-all duration-300 animate-grid-item-in ${canCreateSet ? 'cursor-pointer border-slate-600 hover:border-[var(--primary-400)] hover:text-[var(--primary-400)] text-slate-400 hover:bg-white/5' : 'border-slate-700 text-slate-500 cursor-not-allowed'}`}
                            title={!canCreateSet ? "Free plan allows a maximum of 5 study sets." : "Create a new study set"}
                            style={{ animationDelay: `${100 + studySets.length * 50}ms` }}
                        >
                            <span className="material-symbols-outlined text-3xl mb-3">add</span>
                            <h3 className="font-bold text-lg">New Study Set</h3>
                            {!canCreateSet && <p className="text-xs mt-2">(Plan limit reached)</p>}
                        </div>
                    </div>
                </div>
                 {isCreatingSet && (
                     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setIsCreatingSet(false)}>
                        <div className="liquid-glass-advanced p-6 rounded-xl w-full max-w-md animate-pop-in" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-white mb-4">Create New Study Set</h2>
                            <input
                                type="text"
                                value={newSetName}
                                onChange={(e) => setNewSetName(e.target.value)}
                                placeholder="e.g., Geometry Midterm"
                                className="w-full p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleCreateSet()}
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setIsCreatingSet(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active">Cancel</button>
                                <button onClick={handleCreateSet} disabled={!newSetName.trim()} className="px-4 py-2 rounded-lg bg-[var(--primary-500)] text-white font-semibold button-active disabled:opacity-50">Create</button>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
        </>
    );
};

// --- STUDY SET DETAIL VIEW ---
type Tool = 'overview' | 'materials' | 'explainers' | 'tutor' | 'flashcards' | 'quizzes' | 'essay';

interface StudySetDetailViewProps {
    user: AuthUser;
    studySet: StudySet;
    onUpdateSet: (updatedSet: StudySet) => void;
    onBack: () => void;
    usage: UserUsage;
    updateUsage: (category: 'standard' | 'advanced' | 'assistant') => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const StudySetDetailView: React.FC<StudySetDetailViewProps> = ({ user, studySet, onUpdateSet, onBack, ...props }) => {
    const [activeTool, setActiveTool] = useState<Tool>('overview');
    
    const getMaterialData = useCallback(async (material: Material): Promise<{ mimeType: string; data: string }> => {
        try {
            const cachedFile = await getFile(material.id);
            if (cachedFile) {
                return cachedFile;
            }
            props.addToast({ message: `Downloading ${material.name} for analysis...`, type: 'info' });
            const url = await getMaterialDownloadUrl(material.storagePath);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
            const blob = await response.blob();
            const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const fileData = { mimeType: blob.type, data };
            await saveFile(material.id, fileData);
            return fileData;
        } catch (err: any) {
            console.error("Error getting material data:", err);
            throw new Error(`Could not load material "${material.name}". It may need to be re-uploaded.`);
        }
    }, [props.addToast]);

    const toolIcons: Record<Tool, string> = {
        overview: 'pie_chart',
        materials: 'description',
        explainers: 'menu_book',
        tutor: 'school',
        flashcards: 'style',
        quizzes: 'quiz',
        essay: 'edit_document',
    };
    
    const toolNames: Record<Tool, string> = {
        overview: 'Overview',
        materials: 'Materials',
        explainers: 'Explainers',
        tutor: 'Tutor Me',
        flashcards: 'Flashcards',
        quizzes: 'Tests & Quizzes',
        essay: 'Essay Grading',
    };

    const renderTool = () => {
      const toolProps = { user, studySet, onUpdateSet, getMaterialData, ...props };
      switch (activeTool) {
        case 'overview': return <OverviewTool {...toolProps} />;
        case 'materials': return <MaterialsTool {...toolProps} />;
        case 'explainers': return <ExplainersTool {...toolProps} />;
        case 'tutor': return <TutorTool {...toolProps} />;
        case 'flashcards': return <FlashcardsTool {...toolProps} />;
        case 'quizzes': return <QuizzesTool {...toolProps} />;
        case 'essay': return <EssayGraderTool {...toolProps} />;
        default: return null;
      }
    };
    
    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden h-full">
            <header className="flex-shrink-0 mb-6 flex justify-between items-center">
                <div>
                     <button onClick={onBack} className="text-sm text-[var(--primary-400)] hover:underline mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> All Study Sets
                    </button>
                    <h2 className="text-2xl font-bold text-white truncate max-w-lg">{studySet.name}</h2>
                </div>
            </header>
            
            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0 relative overflow-x-auto lg:overflow-x-visible">
                    <div className="flex lg:flex-col gap-2">
                        {Object.keys(toolNames).map(key => (
                             <button 
                                key={key} 
                                onClick={() => setActiveTool(key as Tool)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 button-active group ${activeTool === key ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                            >
                                <div className={`w-8 h-8 flex items-center justify-center rounded-md bg-white/10 transition-colors ${activeTool === key ? 'text-[var(--primary-300)]' : 'text-slate-400 group-hover:text-white'}`}>
                                  <span className="material-symbols-outlined text-lg">{toolIcons[key as Tool]}</span>
                                </div> 
                                <span>{toolNames[key as Tool]}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Main Content */}
                <div className="flex-1 liquid-glass-advanced glow-on-hover rounded-xl overflow-y-auto animate-fade-in" key={activeTool}>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 border-b border-[var(--glass-border)] pb-4">
                        <span className="material-symbols-outlined text-[var(--primary-400)]">{toolIcons[activeTool]}</span>
                        {toolNames[activeTool]}
                      </h3>
                      {renderTool()}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TOOL SUB-COMPONENTS ---

type ToolProps = Omit<StudySetDetailViewProps, 'onBack'> & {
    getMaterialData: (material: Material) => Promise<{ mimeType: string; data: string }>;
};

const StatRing: React.FC<{ label: string; count: number; icon: string; delay: number }> = ({ label, count, icon, delay }) => {
    return (
      <div className="liquid-glass-light glow-on-hover p-4 rounded-lg text-center flex flex-col items-center justify-center animate-grid-item-in" style={{ animationDelay: `${delay}ms` }}>
        <div className="relative w-24 h-24 mb-2">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-black/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                <circle className="progress-ring text-[var(--primary-400)]" strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={0} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="material-symbols-outlined text-xl text-white mb-1">{icon}</span>
                 <p className="text-2xl font-bold text-white">{count}</p>
            </div>
        </div>
        <p className="text-sm text-slate-300 font-semibold">{label}</p>
      </div>
    );
};

const OverviewTool: React.FC<ToolProps> = ({ studySet }) => {
    const stats = [
        { label: 'Materials', count: studySet.materials.length, icon: 'description' },
        { label: 'Flashcard Sets', count: studySet.flashcards.length, icon: 'style' },
        { label: 'Quizzes', count: studySet.quizzes.length, icon: 'quiz' },
        { label: 'Explainers', count: studySet.explainers.length, icon: 'menu_book' },
        { label: 'Graded Essays', count: studySet.essayGrades.length, icon: 'edit_document' },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {stats.map((stat, index) => (
                <StatRing key={stat.label} {...stat} delay={index * 60} />
            ))}
        </div>
    );
};

const MaterialsTool: React.FC<ToolProps> = ({ user, studySet, onUpdateSet, addToast, getMaterialData }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [cachedFiles, setCachedFiles] = useState<Record<number, boolean>>({});
    const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
    const [cachingIds, setCachingIds] = useState<number[]>([]);

    const checkCache = useCallback(async () => {
        const cacheStatus: Record<number, boolean> = {};
        for (const mat of studySet.materials) {
            try {
                const file = await getFile(mat.id);
                cacheStatus[mat.id] = !!file;
            } catch (err) {
                console.error(`Failed to check cache for material ${mat.id}`, err);
                cacheStatus[mat.id] = false;
            }
        }
        setCachedFiles(cacheStatus);
    }, [studySet.materials]);

    useEffect(() => {
        checkCache();
    }, [checkCache]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            addToast({ message: "Only PDF files are supported.", type: 'error'});
            return;
        }
        setIsUploading(true);
        try {
            const newMaterialId = Date.now();
            const storagePath = await uploadMaterialFile(user.uid, file);
            const newMaterial: Material = { id: newMaterialId, name: file.name, storagePath };
            
            onUpdateSet({ ...studySet, materials: [...studySet.materials, newMaterial] });
            
            const fileData = await fileToBase64(file);
            await saveFile(newMaterialId, fileData);
            setCachedFiles(prev => ({ ...prev, [newMaterialId]: true }));

            addToast({ message: `Added material: ${file.name}`, type: 'success' });
        } catch (err: any) {
            addToast({ message: err.message || "Failed to upload and save file.", type: 'error' });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };
    
    const handleDeleteMaterial = async () => {
        if (!materialToDelete) return;
        try {
            await deleteMaterialFile(materialToDelete.storagePath);
            await deleteFile(materialToDelete.id);
            const updatedMaterials = studySet.materials.filter(m => m.id !== materialToDelete.id);
            onUpdateSet({ ...studySet, materials: updatedMaterials });
            addToast({ message: "Material deleted permanently.", type: 'info' });
        } catch (e: any) {
            addToast({ message: e.message || "Failed to delete material.", type: 'error' });
        } finally {
            setMaterialToDelete(null);
        }
    };
    
    const handleDownloadToCache = async (material: Material) => {
        setCachingIds(prev => [...prev, material.id]);
        try {
            await getMaterialData(material); 
            addToast({ message: `${material.name} is now available offline.`, type: 'success' });
            setCachedFiles(prev => ({ ...prev, [material.id]: true }));
        } catch (e: any) {
            addToast({ message: e.message, type: 'error' });
        } finally {
            setCachingIds(prev => prev.filter(id => id !== material.id));
        }
    };
    
    const handleRemoveFromCache = async (material: Material) => {
        try {
            await deleteFile(material.id);
            addToast({ message: `${material.name} removed from offline cache.`, type: 'info' });
            setCachedFiles(prev => ({ ...prev, [material.id]: false }));
        } catch (e: any) {
            addToast({ message: 'Could not remove file from cache.', type: 'error' });
        }
    };

    return (
        <div>
            <ConfirmationDialog isOpen={!!materialToDelete} onClose={() => setMaterialToDelete(null)} onConfirm={handleDeleteMaterial} title="Delete Material Permanently" message={`Are you sure you want to delete "${materialToDelete?.name}"? This will remove it from the cloud and all local caches.`}/>
            <label htmlFor="material-upload" className="block border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-[var(--primary-400)] hover:bg-white/5 transition-colors mb-6">
                <input type="file" id="material-upload" className="hidden" onChange={handleFileChange} accept=".pdf" disabled={isUploading} />
                {isUploading ? <LoadingIcon className="mx-auto" /> : <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">upload_file</span>}
                <p className="font-semibold text-white mt-1">{isUploading ? "Uploading & Caching..." : "Upload PDF Material"}</p>
                <p className="text-xs text-slate-500 mt-1">Files are stored securely in the cloud and cached on your device.</p>
            </label>
            <div className="space-y-3">
                {studySet.materials.map(mat => (
                    <div key={mat.id} className="liquid-glass-light p-3 rounded-lg flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="material-symbols-outlined text-red-400 text-xl flex-shrink-0">picture_as_pdf</span>
                            <span className="flex-1 text-sm font-medium text-slate-200 truncate">{mat.name}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                           {cachingIds.includes(mat.id) ? (
                                <div className="flex items-center gap-2 text-xs text-amber-400">
                                    <LoadingIcon className="w-4 h-4" /><span>Caching...</span>
                                </div>
                            ) : cachedFiles[mat.id] ? (
                                <div className="flex items-center gap-2 text-xs text-emerald-400" title="Available for offline use">
                                    <span className="material-symbols-outlined text-sm">check_circle</span><span>Offline Ready</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-sky-400" title="Saved in the cloud">
                                    <span className="material-symbols-outlined text-sm">cloud</span><span>In Cloud</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {cachedFiles[mat.id] ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFromCache(mat); }} className="w-7 h-7 bg-black/20 rounded-full text-amber-400 hover:bg-black/40 flex items-center justify-center button-active" title="Remove from offline cache">
                                        <span className="material-symbols-outlined text-base">cloud_off</span>
                                    </button>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadToCache(mat); }} className="w-7 h-7 bg-black/20 rounded-full text-sky-400 hover:bg-black/40 flex items-center justify-center button-active" title="Download for offline use">
                                        <span className="material-symbols-outlined text-base">cloud_download</span>
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setMaterialToDelete(mat); }} className="w-7 h-7 bg-black/20 rounded-full text-red-400 hover:bg-red-500/50 flex items-center justify-center button-active" title="Delete permanently">
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExplainersTool: React.FC<ToolProps> = ({ studySet, onUpdateSet, usage, updateUsage, addToast, getMaterialData }) => {
    const [materialId, setMaterialId] = useState<number | null>(studySet.materials[0]?.id || null);
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    const handleGenerate = async () => {
        const material = studySet.materials.find(m => m.id === materialId);
        if (!material || !topic.trim() || advancedUsesLeft <= 0) {
            if (advancedUsesLeft <= 0) addToast({message: "Advanced AI usage limit reached.", type: 'error'});
            return;
        }
        setIsLoading(true);
        try {
            const fileData = await getMaterialData(material);
            const content = await gemini.generateExplainer(fileData, topic);
            const newExplainer: Explainer = { id: Date.now(), materialId: material.id, materialName: material.name, title: topic, content };

            onUpdateSet({ ...studySet, explainers: [newExplainer, ...studySet.explainers] });
            updateUsage('advanced');
            setTopic('');
        } catch (e: any) {
            addToast({ message: e.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
             {studySet.materials.length === 0 ? <p className="text-slate-400">Please add a material first.</p> : (
             <div className="liquid-glass-light p-4 rounded-lg mb-6 space-y-3">
                <select value={materialId || ''} onChange={e => setMaterialId(Number(e.target.value))} className="w-full p-2 rounded-md liquid-glass-inset">
                    {studySet.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a topic to explain..." className="w-full p-2 rounded-md liquid-glass-inset"/>
                <div className="flex justify-end items-center gap-4 pt-2">
                    <p className="text-sm text-slate-400">{advancedUsesLeft} / {ADVANCED_USAGE_LIMIT} uses left</p>
                    <button onClick={handleGenerate} disabled={isLoading || !materialId || !topic.trim() || advancedUsesLeft <= 0} className="bg-[var(--primary-500)] text-white font-semibold py-2 px-4 rounded-md button-active disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <><span className="material-symbols-outlined animate-thinking">psychology</span> Thinking...</> : 'Generate'}
                    </button>
                </div>
             </div>
             )}
            <div className="space-y-4">
                {studySet.explainers.map(exp => (
                    <details key={exp.id} className="liquid-glass-light p-3 rounded-lg group">
                        <summary className="font-semibold text-white cursor-pointer list-none flex justify-between items-center">
                            <div>
                                {exp.title}
                                <p className="text-xs text-slate-400 font-normal">{exp.materialName}</p>
                            </div>
                            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
                        </summary>
                        <div className="prose prose-invert prose-sm max-w-none mt-3 pt-3 border-t border-white/10" dangerouslySetInnerHTML={{ __html: exp.content.replace(/\n/g, '<br/>') }} />
                    </details>
                ))}
            </div>
        </div>
    );
};

const TutorTool: React.FC<ToolProps> = ({ studySet, onUpdateSet, usage, updateUsage, addToast, getMaterialData }) => {
    const [materialId, setMaterialId] = useState<number | null>(studySet.materials[0]?.id || null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const assistantUsesLeft = STANDARD_USAGE_LIMIT - (usage.assistant?.count || 0);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [studySet.tutorHistory, isLoading]);

    const handleSend = async () => {
        const material = studySet.materials.find(m => m.id === materialId);
        if (!material || !input.trim() || isLoading || assistantUsesLeft <= 0) return;
        
        setIsLoading(true);
        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        const newHistory = [...studySet.tutorHistory, newUserMessage];
        onUpdateSet({...studySet, tutorHistory: newHistory});
        const currentInput = input;
        setInput('');

        try {
            const fileData = await getMaterialData(material);
            const stream = gemini.tutorMeChatStream(fileData, newHistory, currentInput);
            let fullResponse = "";
            let currentHistory: ChatMessage[] = [...newHistory, { role: 'model', parts: [{text: ""}]}];
            
            for await (const chunk of stream) {
                fullResponse += chunk;
                currentHistory[currentHistory.length - 1].parts[0].text = fullResponse;
                onUpdateSet({...studySet, tutorHistory: [...currentHistory]});
            }
            updateUsage('assistant');
        } catch(e: any) {
            addToast({ message: e.message, type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-[70vh] flex flex-col">
            {studySet.materials.length === 0 ? <p className="text-slate-400">Please add a material first.</p> : (
            <>
                <div className="flex-shrink-0 mb-4">
                    <label className="text-sm text-slate-300 mr-2">Context:</label>
                    <select value={materialId || ''} onChange={e => { setMaterialId(Number(e.target.value)); onUpdateSet({...studySet, tutorHistory: []}) }} className="p-2 rounded-md liquid-glass-inset w-full md:w-auto">
                        {studySet.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {studySet.tutorHistory.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'model' && <div className="w-7 h-7 rounded-full bg-[var(--primary-translucent)] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-white text-base">my_location</span></div>}
                             <div className={`max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-[var(--primary-500)] text-white' : 'bg-black/40'}`}>
                                 <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                             </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3 text-sm">
                            <div className="w-7 h-7 rounded-full bg-[var(--primary-translucent)] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-white text-base">my_location</span></div>
                            <div className="max-w-md p-3 rounded-xl bg-black/40 flex items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined animate-thinking text-[var(--primary-400)]">psychology</span>
                                <span>Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                 <div className="mt-auto flex items-center border-t border-white/10 pt-4">
                    <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." rows={1} className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-2 text-slate-200 placeholder-slate-400 text-sm" disabled={isLoading} onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}/>
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="ml-2 w-8 h-8 rounded-full bg-[var(--primary-500)] text-white flex items-center justify-center hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors flex-shrink-0 button-active">
                        {isLoading ? <LoadingIcon /> : <span className="material-symbols-outlined text-sm">send</span>}
                    </button>
                </div>
            </>
            )}
        </div>
    );
};

const FlashcardItem: React.FC<{ card: Flashcard; delay: number }> = ({ card, delay }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className="w-full h-48 flashcard-container animate-grid-item-in" style={{ animationDelay: `${delay}ms` }} onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`flashcard ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="flashcard-face liquid-glass-light"><p className="text-lg font-semibold text-white">{card.question}</p></div>
                <div className="flashcard-face flashcard-back bg-[var(--primary-500)]"><p className="text-md text-white">{card.answer}</p></div>
            </div>
        </div>
    );
};

const FlashcardsTool: React.FC<ToolProps> = ({ studySet, onUpdateSet, usage, updateUsage, addToast, getMaterialData }) => {
    const [materialId, setMaterialId] = useState<number | null>(studySet.materials[0]?.id || null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewingSetId, setViewingSetId] = useState<number | null>(null);

    const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    const handleGenerate = async () => {
        const material = studySet.materials.find(m => m.id === materialId);
        if (!material || advancedUsesLeft <= 0) return;
        setIsLoading(true);
        try {
            const fileData = await getMaterialData(material);
            const cards = await gemini.generateFlashcardsFromDoc(fileData);
            const newSet = { id: Date.now(), materialId: material.id, materialName: material.name, cards };

            onUpdateSet({ ...studySet, flashcards: [newSet, ...studySet.flashcards] });
            updateUsage('advanced');
            addToast({ message: `Generated ${cards.length} flashcards!`, type: 'success' });
        } catch (e: any) { addToast({ message: e.message, type: 'error' }); } finally { setIsLoading(false); }
    };

    if (viewingSetId) {
        const set = studySet.flashcards.find(f => f.id === viewingSetId);
        if (!set) return null;
        return (
            <div>
                <button onClick={() => setViewingSetId(null)} className="text-sm text-[var(--primary-400)] hover:underline mb-4 flex items-center gap-2"><span className="material-symbols-outlined">arrow_back</span> Back to Sets</button>
                <h3 className="text-xl font-bold text-white mb-4">Flashcards for <span className="text-[var(--primary-300)]">{set.materialName}</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {set.cards.map((card, i) => <FlashcardItem key={i} card={card} delay={i * 50} />)}
                </div>
            </div>
        )
    }

    return (
        <div>
             {studySet.materials.length === 0 ? <p className="text-slate-400">Please add a material first.</p> : (
             <div className="liquid-glass-light p-4 rounded-lg mb-6 flex flex-col md:flex-row items-center gap-4">
                <select value={materialId || ''} onChange={e => setMaterialId(Number(e.target.value))} className="w-full md:flex-1 p-2 rounded-md liquid-glass-inset">
                    {studySet.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex items-center gap-4">
                   <p className="text-sm text-slate-400">{advancedUsesLeft} / {ADVANCED_USAGE_LIMIT} uses left</p>
                    <button onClick={handleGenerate} disabled={isLoading || !materialId || advancedUsesLeft <= 0} className="bg-[var(--primary-500)] text-white font-semibold py-2 px-4 rounded-md button-active disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <><span className="material-symbols-outlined animate-thinking">psychology</span> Generating...</> : 'Generate New Set'}
                    </button>
                </div>
             </div>
             )}
            <div className="space-y-3">
                {studySet.flashcards.map(set => (
                    <div key={set.id} className="liquid-glass-light p-3 rounded-lg flex justify-between items-center">
                       <div>
                         <p className="font-semibold text-white">Flashcards from: {set.materialName}</p>
                         <p className="text-xs text-slate-400">{set.cards.length} cards</p>
                       </div>
                       <button onClick={() => setViewingSetId(set.id)} className="bg-white/10 text-white text-sm font-semibold py-1.5 px-4 rounded-md hover:bg-white/20 button-active">View</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const QuizzesTool: React.FC<ToolProps> = ({ studySet, onUpdateSet, usage, updateUsage, addToast, getMaterialData }) => {
    const [materialId, setMaterialId] = useState<number | null>(studySet.materials[0]?.id || null);
    const [quizName, setQuizName] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple-choice']);
    const [isLoading, setIsLoading] = useState(false);
    const [takingQuiz, setTakingQuiz] = useState<GeneratedQuiz | null>(null);

    const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    const handleGenerate = async () => {
        const material = studySet.materials.find(m => m.id === materialId);
        if (!material || !quizName.trim() || advancedUsesLeft <= 0 || questionTypes.length === 0) return;
        setIsLoading(true);
        try {
            const fileData = await getMaterialData(material);
            const questions = await gemini.generateQuiz(fileData, { numQuestions, questionTypes });
            const newQuiz: GeneratedQuiz = { id: Date.now(), materialId: material.id, materialName: material.name, name: quizName.trim(), questions };
            
            onUpdateSet({ ...studySet, quizzes: [newQuiz, ...studySet.quizzes] });
            updateUsage('advanced');
            addToast({ message: `Generated a ${questions.length}-question quiz!`, type: 'success' });
            setQuizName('');
        } catch (e: any) { addToast({ message: e.message, type: 'error' }); } finally { setIsLoading(false); }
    };

    const toggleQuestionType = (type: QuestionType) => {
        setQuestionTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };
    
    if (takingQuiz) {
        return <QuizTaker quiz={takingQuiz} onFinish={() => setTakingQuiz(null)} />;
    }

    return (
        <div>
             {studySet.materials.length === 0 ? <p className="text-slate-400">Please add a material first.</p> : (
             <div className="liquid-glass-light p-4 rounded-lg mb-6 space-y-3">
                <select value={materialId || ''} onChange={e => setMaterialId(Number(e.target.value))} className="w-full p-2 rounded-md liquid-glass-inset">
                    {studySet.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="text" value={quizName} onChange={e => setQuizName(e.target.value)} placeholder="Quiz Name (e.g., Chapter 1 Review)" className="w-full p-2 rounded-md liquid-glass-inset"/>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-slate-300"># of Questions: {numQuestions}</label>
                        <input type="range" min="3" max="15" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full"/>
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Question Types</label>
                        <div className="flex gap-2 mt-1">
                            {(['multiple-choice', 'true-false', 'short-answer'] as QuestionType[]).map(type => (
                                <button key={type} onClick={() => toggleQuestionType(type)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${questionTypes.includes(type) ? 'bg-[var(--primary-500)] border-transparent text-white' : 'border-slate-500 text-slate-300'}`}>
                                    {type.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 pt-2">
                   <p className="text-sm text-slate-400">{advancedUsesLeft} / {ADVANCED_USAGE_LIMIT} uses left</p>
                    <button onClick={handleGenerate} disabled={isLoading || !materialId || !quizName.trim() || advancedUsesLeft <= 0 || questionTypes.length === 0} className="bg-[var(--primary-500)] text-white font-semibold py-2 px-4 rounded-md button-active disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <><span className="material-symbols-outlined animate-thinking">psychology</span> Generating...</> : 'Generate Quiz'}
                    </button>
                </div>
             </div>
             )}
            <div className="space-y-3">
                {studySet.quizzes.map(quiz => (
                    <div key={quiz.id} className="liquid-glass-light p-3 rounded-lg flex justify-between items-center">
                       <div>
                         <p className="font-semibold text-white">{quiz.name}</p>
                         <p className="text-xs text-slate-400">{quiz.questions.length} questions from {quiz.materialName}</p>
                       </div>
                       <button onClick={() => setTakingQuiz(quiz)} className="bg-white/10 text-white text-sm font-semibold py-1.5 px-4 rounded-md hover:bg-white/20 button-active">Take Quiz</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EssayGraderTool: React.FC<ToolProps> = ({ studySet, onUpdateSet, usage, updateUsage, addToast, getMaterialData }) => {
    const [materialId, setMaterialId] = useState<number | null>(studySet.materials[0]?.id || null);
    const [essayTitle, setEssayTitle] = useState('');
    const [essayText, setEssayText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [viewingGradeId, setViewingGradeId] = useState<number|null>(null);

    const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    const handleGrade = async () => {
        const material = studySet.materials.find(m => m.id === materialId);
        if (!material || !essayText.trim() || !essayTitle.trim() || advancedUsesLeft <= 0) return;
        setIsLoading(true);
        try {
            const fileData = await getMaterialData(material);
            const result = await gemini.gradeEssay(fileData, essayText);
            const newGrade: EssayGrade = { id: Date.now(), materialId: material.id, essayTitle, essayText, ...result };
            
            onUpdateSet({ ...studySet, essayGrades: [newGrade, ...studySet.essayGrades] });
            updateUsage('advanced');
            setEssayText(''); setEssayTitle('');
            addToast({ message: "Essay graded successfully!", type: 'success'});
        } catch (e: any) { addToast({ message: e.message, type: 'error' }); } finally { setIsLoading(false); }
    };
    
    if (viewingGradeId) {
        const grade = studySet.essayGrades.find(g => g.id === viewingGradeId);
        if (!grade) return null;
        return (
            <div>
                 <button onClick={() => setViewingGradeId(null)} className="text-sm text-[var(--primary-400)] hover:underline mb-4 flex items-center gap-2"><span className="material-symbols-outlined">arrow_back</span> Back to Grades</button>
                 <h3 className="text-xl font-bold text-white mb-4">{grade.essayTitle}</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 flex flex-col items-center justify-center liquid-glass-light p-6 rounded-lg">
                        <p className="text-sm text-slate-300">Score</p>
                        <p className="text-7xl font-bold text-white">{grade.score}<span className="text-4xl text-slate-400">/100</span></p>
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        <div>
                            <h4 className="font-semibold text-white">Feedback</h4>
                            <p className="text-sm text-slate-300">{grade.feedback}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-white">Suggestions</h4>
                            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                {grade.suggestions.map((s,i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                 </div>
                 <details className="mt-6 liquid-glass-light p-3 rounded-lg group">
                    <summary className="font-semibold text-white cursor-pointer list-none">View Original Essay</summary>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap mt-2 pt-2 border-t border-white/10">{grade.essayText}</p>
                 </details>
            </div>
        )
    }

    return (
        <div>
             {studySet.materials.length === 0 ? <p className="text-slate-400">Please add a material for the AI to grade against.</p> : (
             <div className="liquid-glass-light p-4 rounded-lg mb-6 space-y-3">
                <select value={materialId || ''} onChange={e => setMaterialId(Number(e.target.value))} className="w-full p-2 rounded-md liquid-glass-inset">
                    {studySet.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="text" value={essayTitle} onChange={e => setEssayTitle(e.target.value)} placeholder="Essay Title..." className="w-full p-2 rounded-md liquid-glass-inset"/>
                <textarea value={essayText} onChange={e => setEssayText(e.target.value)} placeholder="Paste your essay text here..." rows={8} className="w-full p-2 rounded-md liquid-glass-inset"/>
                <div className="flex justify-end items-center gap-4 pt-2">
                    <p className="text-sm text-slate-400">{advancedUsesLeft} / {ADVANCED_USAGE_LIMIT} uses left</p>
                    <button onClick={handleGrade} disabled={isLoading || !materialId || !essayText.trim() || advancedUsesLeft <= 0} className="bg-[var(--primary-500)] text-white font-semibold py-2 px-4 rounded-md button-active disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <><span className="material-symbols-outlined animate-thinking">psychology</span> Grading...</> : 'Grade Essay'}
                    </button>
                </div>
             </div>
             )}
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Past Grades</h4>
                {studySet.essayGrades.map(grade => (
                    <div key={grade.id} className="liquid-glass-light p-3 rounded-lg flex justify-between items-center">
                       <div>
                         <p className="font-semibold text-white">{grade.essayTitle}</p>
                         <p className="text-xs text-slate-400">Score: {grade.score}/100</p>
                       </div>
                       <button onClick={() => setViewingGradeId(grade.id)} className="bg-white/10 text-white text-sm font-semibold py-1.5 px-4 rounded-md hover:bg-white/20 button-active">View Details</button>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default FocusStudioPanel;