/**
 * Punto de entrada del juego Phaser. Configura las escenas y la resolución.
 */
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MenuScene, ProgressScene, GameScene]
};

const game = new Phaser.Game(config);