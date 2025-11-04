import React, { useState, useEffect } from 'react';
import { LoadingIcon } from './icons/LoadingIcon';
import type { Toast } from '../types';

interface GoogleDocsPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (doc: { id: string; title: string; content: string }) => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    googleAccessToken: string | null;
    handleConnectGoogleAccount: () => void;
}

interface GDocFile {
    id: string;
    name: string;
    modifiedTime: string;
}

const parseDocContent = (body: any): string => {
    let htmlContent = '';
    if (!body || !body.content) return '';

    for (const element of body.content) {
        if (element.paragraph) {
            let paragraphHtml = '';
            for (const pe of element.paragraph.elements) {
                if (pe.textRun && pe.textRun.content) {
                    let text = pe.textRun.content;
                    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    if (pe.textRun.textStyle) {
                        if (pe.textRun.textStyle.bold) text = `<b>${text}</b>`;
                        if (pe.textRun.textStyle.italic) text = `<i>${text}</i>`;
                        if (pe.textRun.textStyle.underline) text = `<u>${text}</u>`;
                    }
                    paragraphHtml += text;
                }
            }
            paragraphHtml = paragraphHtml.replace(/\n/g, '<br>');
            if (paragraphHtml.trim() !== '<br>' && paragraphHtml.trim() !== '') {
                 htmlContent += `<p>${paragraphHtml}</p>`;
            }
        }
    }
    return htmlContent;
};


const GoogleDocsPickerModal: React.FC<GoogleDocsPickerModalProps> = ({ isOpen, onClose, onImport, addToast, googleAccessToken, handleConnectGoogleAccount }) => {
    const [docs, setDocs] = useState<GDocFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImportingId, setIsImportingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchDocs = async (token: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const query = `mimeType='application/vnd.google-apps.document'${searchTerm ? ` and name contains '${searchTerm}'` : ''}`;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if(response.status === 401 || response.status === 403) {
                     throw new Error('Permission denied. Please reconnect your Google Account.');
                }
                throw new Error('Failed to fetch documents from Google Drive.');
            }
            const data = await response.json();
            setDocs(data.files || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && googleAccessToken) {
            fetchDocs(googleAccessToken);
        } else if (isOpen) {
            setIsLoading(false);
        }
    }, [isOpen, googleAccessToken]);
    
    const handleImport = async (doc: GDocFile) => {
        if (!googleAccessToken) return;
        setIsImportingId(doc.id);
        try {
            const response = await fetch(`https://docs.googleapis.com/v1/documents/${doc.id}`, {
                 headers: { 'Authorization': `Bearer ${googleAccessToken}` }
            });
            if (!response.ok) throw new Error("Failed to fetch document content.");
            const data = await response.json();
            const content = parseDocContent(data.body);
            onImport({ id: doc.id, title: doc.name, content });
            onClose();
        } catch (e: any) {
            addToast({ message: e.message, type: 'error' });
        } finally {
            setIsImportingId(null);
        }
    };
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if(googleAccessToken) fetchDocs(googleAccessToken);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="liquid-glass rounded-xl shadow-2xl p-6 w-full max-w-2xl h-[80vh] m-4 flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">Import from Google Docs</h2>
                {!googleAccessToken ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-6xl text-slate-500 mb-4">folder_managed</span>
                        <p className="text-slate-300 mb-4">Connect your Google Account to browse and import your documents.</p>
                        <button onClick={handleConnectGoogleAccount} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] button-active flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
                            Connect Google Account
                        </button>
                        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4 flex-shrink-0">
                            <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search your docs..." className="flex-1 p-2 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent"/>
                            <button type="submit" className="bg-white/10 text-white font-bold w-10 h-10 rounded-lg hover:bg-white/20 button-active"><span className="material-symbols-outlined">search</span></button>
                        </form>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full"><LoadingIcon /></div>
                            ) : error ? (
                                <div className="text-center text-red-400 p-8">{error}</div>
                            ) : (
                                <div className="space-y-2">
                                    {docs.map(doc => (
                                        <div key={doc.id} className="liquid-glass-light p-3 rounded-lg flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-white truncate">{doc.name}</p>
                                                <p className="text-xs text-slate-400">Last modified: {new Date(doc.modifiedTime).toLocaleDateString()}</p>
                                            </div>
                                            <button onClick={() => handleImport(doc)} disabled={isImportingId === doc.id} className="bg-[var(--primary-500)] text-white text-sm font-semibold py-1.5 px-4 rounded-md hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] w-24 flex-shrink-0 text-center button-active">
                                                {isImportingId === doc.id ? <LoadingIcon className="w-4 h-4 mx-auto"/> : 'Import'}
                                            </button>
                                        </div>
                                    ))}
                                    {docs.length === 0 && <div className="text-center text-slate-400 p-8">No documents found.</div>}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GoogleDocsPickerModal;