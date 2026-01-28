export const HISTORY_KEY = 'pa_trainer_history';

export const getHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveSession = (session) => {
  try {
    const history = getHistory();
    const existingIndex = history.findIndex(h => h.id === session.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...session, lastUpdated: Date.now() };
    } else {
      history.unshift({ ...session, lastUpdated: Date.now() });
    }
    
    // Limit to last 50 sessions to save space
    if (history.length > 50) {
        history.length = 50;
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save session", e);
  }
};

export const deleteSession = (sessionId) => {
    try {
        const history = getHistory().filter(h => h.id !== sessionId);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return history;
    } catch (e) {
        console.error("Failed to delete session", e);
        return [];
    }
};

export const createSessionId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
