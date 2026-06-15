class SyncQueue {
  constructor() {
    this.QUEUE_KEY = 'offline_sync_outbox';
    this.isSyncing = false;
  }

  // Retrieve current pending outbox queue safely
  getQueue() {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error("Failed to read sync outbox queue:", e);
      return [];
    }
  }

  // Queue up an action payload when offline
  enqueue(actionType, data) {
    const queue = this.getQueue();
    const queuedAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionType,
      data,
      timestamp: Date.now()
    };

    queue.push(queuedAction);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    console.log(`📦 Action [${actionType}] queued offline. Items in outbox: ${queue.length}`);
    return queuedAction.id;
  }

  // Process and drain the queue sequentially once online
  async flushQueue(apiSubmitCallback) {
    if (this.isSyncing || !navigator.onLine) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`⚡ Connection detected. Processing ${queue.length} pending driveway workouts...`);

    // Process items in chronological order (FIFO)
    while (queue.length > 0) {
      const currentAction = queue[0];
      try {
        // Attempt to process payload using passed API handler
        await apiSubmitCallback(currentAction.actionType, currentAction.data);

        // Remove item from memory array on success
        queue.shift();
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        console.log(`✅ Successfully synchronized action item: ${currentAction.id}`);
      } catch (error) {
        console.error(`❌ Sync batch processing failed for item ${currentAction.id}. Halting queue to preserve order.`, error);
        break; // Stop draining the queue to maintain structural order if backend is throwing errors
      }
    }

    this.isSyncing = false;
  }

  /** How many items are waiting in the outbox */
  pendingCount() {
    return this.getQueue().length;
  }

  /** Wipe the outbox — call on account reset */
  clearQueue() {
    try {
      localStorage.removeItem(this.QUEUE_KEY);
    } catch {}
  }
}

export const syncQueue = new SyncQueue();
