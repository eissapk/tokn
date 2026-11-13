/**
 * Saved chats on disk, using the browser's private file system (OPFS).
 * Each chat is one file:  sessions/<id>.json
 *
 * If storage isn't available, every call fails quietly and the app
 * simply doesn't remember chats.
 */

const folder = async () => (await navigator.storage.getDirectory()).getDirectoryHandle("sessions", { create: true });

// Run file writes one at a time, so two saves of the same chat never overlap.
let queue = Promise.resolve();
const inOrder = (task) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};

/** Every saved chat. */
export async function listSessions() {
  try {
    navigator.storage.persist?.(); // ask the browser not to delete our files when disk is low
    const sessions = [];
    for await (const file of (await folder()).values()) {
      try {
        sessions.push(JSON.parse(await (await file.getFile()).text()));
      } catch {
        // skip a damaged file
      }
    }
    return sessions;
  } catch (err) {
    console.warn("Chat history unavailable:", err.message);
    return [];
  }
}

export function saveSession(session) {
  const json = JSON.stringify(session); // snapshot now: the chat may change before the write runs
  return inOrder(async () => {
    const file = await (await folder()).getFileHandle(`${session.id}.json`, { create: true });
    const writable = await file.createWritable();
    await writable.write(json);
    await writable.close();
  }).catch((err) => console.error("Failed to save chat:", err.message));
}

export function deleteSession(id) {
  return inOrder(async () => (await folder()).removeEntry(`${id}.json`)).catch((err) => {
    if (err.name !== "NotFoundError") console.error("Failed to delete chat:", err.message);
  });
}
