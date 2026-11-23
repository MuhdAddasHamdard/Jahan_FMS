let database;

const connect = () => {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("jahan-fms-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("reads", { keyPath: ["owner", "path"] })
        .createIndex("owner", "owner");
      db.createObjectStore("changes", { keyPath: "sequence", autoIncrement: true })
        .createIndex("owner", "owner");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
};

const transact = async (storeName, mode, work) => {
  const db = await connect();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = work(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request?.result);
    tx.onabort = () => reject(tx.error);
  });
};

export const readSnapshot = (owner, path) =>
  transact("reads", "readonly", (store) => store.get([owner, path]));

export const writeSnapshot = (snapshot) =>
  transact("reads", "readwrite", (store) => store.put(snapshot));

export const deleteSnapshot = (owner, path) =>
  transact("reads", "readwrite", (store) => store.delete([owner, path]));

const removeSnapshots = (owner, shouldRemove) =>
  transact("reads", "readwrite", (store) => {
    const request = store.index("owner").openCursor(owner);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (shouldRemove(cursor.value)) cursor.delete();
      cursor.continue();
    };
  });

export const clearSnapshots = (owner) => removeSnapshots(owner, () => true);
export const pruneSnapshots = (owner, cutoff) =>
  removeSnapshots(owner, ({ checkedAt }) => !checkedAt || checkedAt < cutoff);

export const addChange = (change) =>
  transact("changes", "readwrite", (store) => store.add(change));

export const updateChange = (change) =>
  transact("changes", "readwrite", (store) => store.put(change));

export const listChanges = (owner) =>
  transact("changes", "readonly", (store) => store.index("owner").getAll(owner));

export const deleteChange = (sequence) =>
  transact("changes", "readwrite", (store) => store.delete(sequence));
