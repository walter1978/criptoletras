/**
 * Escena del Menú Principal del juego.
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    init(data) {
        this.levels = (data && data.levels && data.levels.length > 0) ? data.levels : DEFAULT_LEVELS;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a110a);
        this.renderUI();

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    handleResize(gameSize) {
        this.cameras.resize(gameSize.width, gameSize.height);
        this.renderUI();
    }

    renderUI() {
        this.children.removeAll();

        const { width, height } = this.scale;
        const cardW = Math.min(width - 32, 420);
        const centerX = width / 2;

        const isCompact = height < 460;
        let curY = isCompact ? 20 : Math.max(35, (height - 280) / 2);

        this.add.text(centerX, curY, "📖", {
            fontSize: isCompact ? '32px' : '44px'
        }).setOrigin(0.5);

        curY += isCompact ? 38 : 52;

        const titleSize = Math.min(36, Math.max(26, Math.floor(width * 0.085)));
        
        this.add.text(centerX, curY, TEXTS.menu.title, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: '#f3e5ab'
        }).setOrigin(0.5);

        curY += isCompact ? 26 : 36;

        this.add.text(centerX, curY, TEXTS.menu.subtitle, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '22px',
            fontStyle: 'italic',
            color: '#d7ccc8'
        }).setOrigin(0.5);

        curY += isCompact ? 35 : 45;

        const btnW = Math.min(cardW, 280);
        const playBtnH = isCompact ? 46 : 52;

        this.createMenuButton(
            centerX,
            curY + playBtnH / 2,
            TEXTS.menu.playBtn,
            () => {
                const targetIdx = ProgressManager.getNextPlayableLevelIdx(this.levels);
                this.scene.start('GameScene', { levels: this.levels, startLevelIdx: targetIdx });
            },
            btnW,
            playBtnH,
            0x5a341e,
            0xd97706,
            '20px'
        );

        curY += playBtnH + (isCompact ? 16 : 22);

        const progBtnH = isCompact ? 42 : 48;
        this.createMenuButton(
            centerX,
            curY + progBtnH / 2,
            TEXTS.menu.progressBtn,
            () => {
                this.scene.start('ProgressScene', { levels: this.levels });
            },
            btnW,
            progBtnH,
            0x3a281c,
            0x8d6e63,
            '17px'
        );
    }

    createMenuButton(x, y, text, callback, btnWidth, btnHeight, bgColor, strokeColor, fontSize = '18px') {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, bgColor)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, strokeColor);

        const txt = this.add.text(0, 0, text, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: fontSize,
            fontStyle: 'bold',
            color: '#fff8ea'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.setScale(0.97);
            this.time.delayedCall(80, () => {
                if (bg.active) bg.setScale(1.0);
                callback();
            });
        });

        bg.on('pointerover', () => {
            bg.setFillStyle(Phaser.Display.Color.IntegerToColor(bgColor).brighten(18).color);
        });

        bg.on('pointerout', () => {
            if (bg.active) {
                bg.setFillStyle(bgColor);
                bg.setScale(1.0);
            }
        });

        container.add([bg, txt]);
        return container;
    }
}