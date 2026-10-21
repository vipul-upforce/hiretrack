// lib/dndLock.ts
const DndSyncLock = {
    isLocked: false,
    lockUntil: 0,
    
    lock: (durationMs = 2500) => {
      DndSyncLock.isLocked = true;
      DndSyncLock.lockUntil = Date.now() + durationMs;
      // Auto-unlock fallback
      
      setTimeout(() => {
        if (Date.now() >= DndSyncLock.lockUntil) {
          DndSyncLock.isLocked = false;
        }
      }, durationMs);
    },
    
    checkIsLocked: () => {
      if (Date.now() >= DndSyncLock.lockUntil) {
        DndSyncLock.isLocked = false;
      }
      return DndSyncLock.isLocked;
    },
  
    unlock: () => {
      DndSyncLock.isLocked = false;
      DndSyncLock.lockUntil = 0;
    }
  };
  export default DndSyncLock;