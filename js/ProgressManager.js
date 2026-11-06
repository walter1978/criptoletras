/**
 * Gestor de almacenamiento local del progreso del jugador.
 */
const STORAGE_KEY = 'criptoletras_progreso_v1';
const LEGACY_STORAGE_KEY = ['jue', 'go_lite', 'rario_progreso_v1'].join('');

const ProgressManager = {
    load() {
        try {
            let raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (legacyRaw) {
                    raw = legacyRaw;
                    localStorage.setItem(STORAGE_KEY, legacyRaw);
                }
            }
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (!parsed.completedLevels) parsed.completedLevels = {};
                    if (!parsed.startedLevels) parsed.startedLevels = {};
                    if (!parsed.savedGuesses) parsed.savedGuesses = {};
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('No se pudo acceder a localStorage:', e);
        }
        return {
            completedLevels: {},
            startedLevels: {},
            savedGuesses: {},
            lastPlayedLevelIdx: 0
        };
    },

    save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    },

    markLevelCompleted(levelId) {
        const data = this.load();
        if (!data.completedLevels) data.completedLevels = {};
        data.completedLevels[levelId] = {
            completedAt: new Date().toISOString()
        };
        if (data.startedLevels && data.startedLevels[levelId]) {
            delete data.startedLevels[levelId];
        }
        this.save(data);
    },

    isLevelCompleted(levelId) {
        const data = this.load();
        return !!(data.completedLevels && data.completedLevels[levelId]);
    },

    saveLevelProgress(levelId, progressData) {
        const data = this.load();
        if (!data.startedLevels) data.startedLevels = {};
        if (!data.savedGuesses) data.savedGuesses = {};

        data.savedGuesses[levelId] = progressData.guesses;
        data.startedLevels[levelId] = {
            percent: progressData.percent,
            correctCount: progressData.correctCount,
            totalCount: progressData.totalCount,
            updatedAt: new Date().toISOString()
        };
        this.save(data);
    },

    isLevelStarted(levelId) {
        if (this.isLevelCompleted(levelId)) return false;
        const data = this.load();
        if (data.startedLevels && data.startedLevels[levelId]) return true;
        if (data.savedGuesses && data.savedGuesses[levelId] && Object.keys(data.savedGuesses[levelId]).length > 0) return true;
        return false;
    },

    getLevelProgress(level) {
        const data = this.load();
        if (data.startedLevels && data.startedLevels[level.id]) {
            return data.startedLevels[level.id];
        }
        const guesses = (data.savedGuesses && data.savedGuesses[level.id]) || {};
        const q = cleanText(level.quote).replace(/\s/g, '').length;
        const a = cleanText(level.author).replace(/\s/g, '').length;
        const b = cleanText(level.book).replace(/\s/g, '').length;
        const total = q + a + b;
        const filled = Object.keys(guesses).length;
        const percent = total > 0 ? Math.min(99, Math.round((filled / total) * 100)) : 0;
        return {
            percent: Math.max(1, percent),
            correctCount: filled,
            totalCount: total
        };
    },

    setLastPlayedLevel(index) {
        const data = this.load();
        data.lastPlayedLevelIdx = index;
        this.save(data);
    },

    getLastPlayedLevel() {
        const data = this.load();
        return typeof data.lastPlayedLevelIdx === 'number' ? data.lastPlayedLevelIdx : 0;
    },

    saveLevelGuesses(levelId, guesses) {
        const data = this.load();
        if (!data.savedGuesses) data.savedGuesses = {};
        data.savedGuesses[levelId] = guesses;
        this.save(data);
    },

    getLevelGuesses(levelId) {
        const data = this.load();
        return (data.savedGuesses && data.savedGuesses[levelId]) ? data.savedGuesses[levelId] : null;
    },

    clearLevelGuesses(levelId) {
        const data = this.load();
        if (data.savedGuesses && data.savedGuesses[levelId]) {
            delete data.savedGuesses[levelId];
            this.save(data);
        }
    },

    getCompletedCount(levels) {
        const data = this.load();
        if (!data.completedLevels) return 0;
        let count = 0;
        levels.forEach(lvl => {
            if (data.completedLevels[lvl.id]) count++;
        });
        return count;
    },

    getNextPlayableLevelIdx(levels) {
        if (!levels || levels.length === 0) return 0;
        const last = this.getLastPlayedLevel();
        if (last >= 0 && last < levels.length && !this.isLevelCompleted(levels[last].id)) {
            return last;
        }
        const startedIdx = levels.findIndex(lvl => this.isLevelStarted(lvl.id));
        if (startedIdx !== -1) {
            return startedIdx;
        }
        const firstUnfinished = levels.findIndex(lvl => !this.isLevelCompleted(lvl.id));
        if (firstUnfinished !== -1) {
            return firstUnfinished;
        }
        return (last >= 0 && last < levels.length) ? last : 0;
    },

    reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (e) {
            console.warn('Error al reiniciar progreso:', e);
        }
    }
};