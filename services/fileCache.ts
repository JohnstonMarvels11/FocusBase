// --- INDEXEDDB FILE CACHE SERVICE ---

const DB_NAME = 'FocusBaseFileCache';
const STORE_NAME = 'materials';
const DB_VERSION = 1;

let db: IDBDatabase;

/**
 * Initializes the IndexedDB database.
 * @returns A promise that resolves to true if successful.
 */
export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(true);
    if (!window.indexedDB) {
        const errorMsg = "Offline storage is not supported in your browser. Materials will not be saved between sessions.";
        console.error(errorMsg);
        return reject(new Error(errorMsg));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => { 
        const errorMsg = `IndexedDB error: ${request.error}`;
        console.error(errorMsg); 
        reject(new Error(errorMsg)); 
    };
    request.onsuccess = () => { db = request.result; resolve(true); };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Saves a file's base64 data to the cache.
 * @param id The unique ID for the file (material ID).
 * @param data The file's mimeType and base64 data string.
 */
export const saveFile = (id: number, data: { mimeType: string; data: string }): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) { 
        initDB().then(() => saveFile(id, data).then(resolve).catch(reject)).catch(reject);
        return; 
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ id, ...data });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Retrieves a file's data from the cache.
 * @param id The ID of the file to retrieve.
 * @returns The file data, or null if not found.
 */
export const getFile = (id: number): Promise<{ mimeType: string; data: string } | null> => {
  return new Promise((resolve, reject) => {
    if (!db) { 
        initDB().then(() => getFile(id).then(resolve).catch(reject)).catch(reject);
        return; 
    }
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ? { mimeType: request.result.mimeType, data: request.result.data } : null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Deletes a file from the cache.
 * @param id The ID of the file to delete.
 */
export const deleteFile = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) { 
        initDB().then(() => deleteFile(id).then(resolve).catch(reject)).catch(reject);
        return; 
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};