/**
 * Chat history on disk, in the Origin Private File System.
 *
 *   /sessions/<id>.json  ->  { id, title, model, createdAt, updatedAt, messages }
 *
 * One file per session, so saving a streaming reply rewrites that one thread
 * and never the whole history.
 *
 * Every file operation runs inside a small Worker, writing through
 * createSyncAccessHandle(). That is the one OPFS write path every engine
 * ships (Chromium 102+, Firefox 111+, Safari 15.2+); the main-thread
 * createWritable() is missing from older Safari. The worker handles one
 * request at a time, so two saves of the same file can never overlap, and a
 * delete queued after a save always runs after it.
 *
 * Where OPFS is missing or refused (Firefox private windows, very old
 * engines) every call settles quietly: the app keeps working, it just
 * remembers nothing.
 */

/* Runs in the worker. It is stringified into a Blob below, so it must not
   reference anything outside its own body. */
function opfsWorker() {
  let folder = null;
  const sessions = async () => {
    if (!folder) folder = await (await navigator.storage.getDirectory()).getDirectoryHandle("sessions", { create: true });
    return folder;
  };

  const ops = {
    async list() {
      const out = [];
      for await (const handle of (await sessions()).values()) {
        if (handle.kind !== "file" || !handle.name.endsWith(".json")) continue;
        // A file cut short by a crash mid-write is skipped, not fatal.
        try {
          out.push(JSON.parse(await (await handle.getFile()).text()));
        } catch {}
      }
      return out;
    },

    // The access handle's methods were async in older engines and are sync
    // now; awaiting each one works on both.
    async save({ id, json }) {
      const file = await (await sessions()).getFileHandle(`${id}.json`, { create: true });
      const access = await file.createSyncAccessHandle();
      try {
        const bytes = new TextEncoder().encode(json);
        await access.truncate(0);
        await access.write(bytes, { at: 0 });
        await access.flush();
      } finally {
        await access.close();
      }
    },

    async remove({ id }) {
      try {
        await (await sessions()).removeEntry(`${id}.json`);
      } catch (err) {
        if (err.name !== "NotFoundError") throw err;
      }
    },
  };

  let queue = Promise.resolve();
  self.onmessage = ({ data: { n, op, arg } }) => {
    queue = queue
      .then(() => ops[op](arg))
      .then(
        (result) => self.postMessage({ n, result }),
        (err) => self.postMessage({ n, error: `${err.name}: ${err.message}` }),
      );
  };
}

/* -------------------------------------------------------------------------- */
/* Main thread                                                                */
/* -------------------------------------------------------------------------- */

const supported = typeof Worker !== "undefined" && !!(navigator.storage && navigator.storage.getDirectory);

let worker = null;
let seq = 0;
const pending = new Map();

const failAll = (message) => {
  pending.forEach(({ reject }) => reject(new Error(message)));
  pending.clear();
};

const start = () => {
  const url = URL.createObjectURL(new Blob([`(${opfsWorker})()`], { type: "text/javascript" }));
  worker = new Worker(url);
  worker.onmessage = ({ data: { n, result, error } }) => {
    const call = pending.get(n);
    if (!call) return;
    pending.delete(n);
    error ? call.reject(new Error(error)) : call.resolve(result);
  };
  worker.onerror = (e) => failAll(e.message || "storage worker failed");
};

const call = (op, arg) => {
  if (!supported) return Promise.reject(new Error("OPFS is not available in this browser"));
  if (!worker) start();
  return new Promise((resolve, reject) => {
    const n = ++seq;
    pending.set(n, { resolve, reject });
    worker.postMessage({ n, op, arg });
  });
};

/** Every saved session, newest first. Empty when storage isn't available. */
export const listSessions = () =>
  call("list")
    .then((all) => all.sort((a, b) => b.updatedAt - a.updatedAt))
    .catch((err) => {
      console.warn("Chat history unavailable:", err.message);
      return [];
    });

/** Write one session. It is serialised now, so later edits to the live
    object don't leak into a write that is still waiting its turn -- and a
    store proxy can't cross postMessage anyway, a string can. */
export const saveSession = (session) =>
  call("save", { id: session.id, json: JSON.stringify(session) }).catch((err) => console.error("Failed to save chat:", err.message));

export const deleteSession = (id) => call("remove", { id }).catch((err) => console.error("Failed to delete chat:", err.message));

/** Ask the browser not to evict history under disk pressure. OPFS is
    best-effort storage otherwise. The answer doesn't change anything here. */
export const requestPersistence = () => {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    /* ignore */
  }
};
