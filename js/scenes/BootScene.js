/**
 * Escena de arranque de Phaser: Carga levels.json y da paso al menú principal.
 */
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.on('loaderror', (file) => {
            console.error('Error al cargar el archivo externo:', file.key);
        });
        
        // Intentamos cargar levels.json
        this.load.json('levelsData', 'levels.json');
    }

    create() {
        let loadedLevels = [];
        try {
            const cacheData = this.cache.json.get('levelsData');
            if (Array.isArray(cacheData) && cacheData.length > 0) {
                loadedLevels = cacheData;
            } else {
                console.warn('levels.json vacíos, usando niveles por defecto de respaldo.');
            }
        } catch (e) {
            console.error('No se pudo procesar levels.json, usando respaldo:', e);
        }

        // Niveles de respaldo por si falla la carga externa en PWA instalada
        if (loadedLevels.length === 0) {
            loadedLevels = [
                {
                    id: 1,
                    quote: TEXTS.fallbackLevel.quote,
                    author: TEXTS.fallbackLevel.author,
                    book: TEXTS.fallbackLevel.book
                }
            ];
        }

        this.scene.start('MenuScene', { levels: loadedLevels });
    }
}