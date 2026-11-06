/**
 * Escena de revisión del progreso del jugador.
 */
class ProgressScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ProgressScene' });
    }

    init(data) {
        this.levels = (data && data.levels && data.levels.length > 0) ? data.levels : DEFAULT_LEVELS;
        this.scrollY = 0;
        this.maxScrollY = 0;
        this.isDragging = false;
        this.dragStartY = 0;
        this.pointerDownPos = { x: 0, y: 0 };
        this.hasMoved = false;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a110a);

        this.contentContainer = this.add.container(0, 0);
        this.headerContainer = this.add.container(0, 0);
        this.headerContainer.setDepth(20);

        this.renderUI();
        this.setupScrolling();

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    handleResize(gameSize) {
        this.cameras.resize(gameSize.width, gameSize.height);
        this.renderUI();
    }

    setScroll(val) {
        this.scrollY = Phaser.Math.Clamp(val, -this.maxScrollY, 0);
        this.contentContainer.y = this.scrollY;
    }

    setupScrolling() {
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < 100) return;
            this.isDragging = true;
            this.dragStartY = pointer.y - this.scrollY;
            this.pointerDownPos = { x: pointer.x, y: pointer.y };
            this.hasMoved = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isDragging) {
                const dx = pointer.x - this.pointerDownPos.x;
                const dy = pointer.y - this.pointerDownPos.y;

                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                    this.hasMoved = true;
                }

                if (this.hasMoved) {
                    const newY = pointer.y - this.dragStartY;
                    this.setScroll(newY);
                }
            }
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.setScroll(this.scrollY - deltaY * 0.5);
        });
    }

    renderUI() {
        const { width, height } = this.scale;
        this.headerContainer.removeAll(true);
        this.contentContainer.removeAll(true);
        this.scrollY = 0;
        this.contentContainer.y = 0;

        const completed = ProgressManager.getCompletedCount(this.levels);

        const headerH = 100;
        const headerBg = this.add.rectangle(width / 2, headerH / 2, width, headerH, 0x1a110a);
        const headerBorder = this.add.rectangle(width / 2, headerH, width, 2, 0x3d271d);

        const title = this.add.text(width / 2, 32, "TU PROGRESO", {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#f3e5ab'
        }).setOrigin(0.5);

        const summaryText = this.add.text(width / 2, 68, `Frases resueltas: ${completed} de ${this.levels.length}`, {
            fontFamily: 'sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#cbb69d'
        }).setOrigin(0.5);

        this.headerContainer.add([headerBg, headerBorder, title, summaryText]);

        const itemsToShow = [];
        this.levels.forEach((lvl, idx) => {
            const isDone = ProgressManager.isLevelCompleted(lvl.id);
            const isStarted = !isDone && ProgressManager.isLevelStarted(lvl.id);

            if (isDone) {
                itemsToShow.push({
                    level: lvl,
                    originalIndex: idx,
                    isDone: true,
                    isStarted: false
                });
            } else if (isStarted) {
                const prog = ProgressManager.getLevelProgress(lvl);
                itemsToShow.push({
                    level: lvl,
                    originalIndex: idx,
                    isDone: false,
                    isStarted: true,
                    percent: prog.percent,
                    correctCount: prog.correctCount,
                    totalCount: prog.totalCount
                });
            }
        });

        const cardW = Math.min(width - 24, 520);
        const cardGap = 16;
        let startY = headerH + 20;
        let currentY = startY;

        if (itemsToShow.length === 0) {
            const emptyBoxW = Math.min(width - 32, 440);
            const emptyBoxH = 130;
            const emptyBoxY = startY + emptyBoxH / 2 + 10;

            const emptyBox = this.add.rectangle(width / 2, emptyBoxY, emptyBoxW, emptyBoxH, 0x221710)
                .setStrokeStyle(1.5, 0x5c4238);

            const emptyIcon = this.add.text(width / 2, emptyBoxY - 32, "📜", { fontSize: '32px' }).setOrigin(0.5);
            const emptyTitle = this.add.text(width / 2, emptyBoxY + 6, "No hay frases completadas ni iniciadas", {
                fontFamily: 'Georgia, Garamond, serif',
                fontSize: '17px',
                fontStyle: 'bold',
                color: '#f3e5ab'
            }).setOrigin(0.5);
            const emptySub = this.add.text(width / 2, emptyBoxY + 36, "Descifra frases literarias para registrar tu avance aquí.", {
                fontFamily: 'sans-serif',
                fontSize: '13px',
                color: '#a89284'
            }).setOrigin(0.5);

            this.contentContainer.add([emptyBox, emptyIcon, emptyTitle, emptySub]);
            currentY = emptyBoxY + emptyBoxH / 2 + 30;
        } else {
            itemsToShow.forEach((item, displayIdx) => {
                const lvl = item.level;
                const isDone = item.isDone;

                const leftX = -cardW / 2 + 18;
                const maxTextW = cardW - 145;

                const titleTextStr = isDone ? `Frase ${lvl.id}: ${lvl.book}` : `Frase ${lvl.id}: [Obra oculta]`;
                const authorTextStr = isDone ? `Autor: ${lvl.author}` : `Autor: [Por descubrir]`;
                const detailTextStr = isDone 
                    ? `“${lvl.quote.length > 55 ? lvl.quote.substring(0, 52) + '...' : lvl.quote}”`
                    : `Progreso: ${item.percent}% descifrado`;

                const tempTitle = this.add.text(0, 0, titleTextStr, { fontFamily: 'Georgia, Garamond, serif', fontSize: '16px', fontStyle: 'bold', wordWrap: { width: maxTextW } });
                const tempAuthor = this.add.text(0, 0, authorTextStr, { fontFamily: 'sans-serif', fontSize: '14px', wordWrap: { width: maxTextW } });
                const tempDetail = this.add.text(0, 0, detailTextStr, { fontFamily: isDone ? 'Georgia, Garamond, serif' : 'sans-serif', fontSize: '13px', wordWrap: { width: maxTextW } });

                const contentH = tempTitle.height + tempAuthor.height + tempDetail.height + 40;
                const cardH = Math.max(130, contentH);

                tempTitle.destroy();
                tempAuthor.destroy();
                tempDetail.destroy();

                const cardY = currentY + cardH / 2;
                const card = this.add.container(width / 2, cardY);

                const bg = this.add.rectangle(0, 0, cardW, cardH, isDone ? 0x221a14 : 0x241810)
                    .setStrokeStyle(1.5, isDone ? 0x10b981 : 0xd97706)
                    .setInteractive({ useHandCursor: true });

                bg.on('pointerup', () => {
                    if (!this.hasMoved) {
                        this.scene.start('GameScene', { levels: this.levels, startLevelIdx: item.originalIndex });
                    }
                });

                let curY = -cardH / 2 + 16;

                const titleTxt = this.add.text(leftX, curY, titleTextStr, {
                    fontFamily: 'Georgia, Garamond, serif',
                    fontSize: '16px',
                    fontStyle: 'bold',
                    color: isDone ? '#fff8ea' : '#f3e5ab',
                    wordWrap: { width: maxTextW, useAdvancedWrap: true }
                });
                curY += titleTxt.height + 6;

                const authorTxt = this.add.text(leftX, curY, authorTextStr, {
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    fontStyle: isDone ? 'normal' : 'italic',
                    color: isDone ? '#cbb69d' : '#8d6e63',
                    wordWrap: { width: maxTextW, useAdvancedWrap: true }
                });
                curY += authorTxt.height + 6;

                const detailTxt = this.add.text(leftX, curY, detailTextStr, {
                    fontFamily: isDone ? 'Georgia, Garamond, serif' : 'sans-serif',
                    fontSize: '13px',
                    fontStyle: isDone ? 'italic' : 'bold',
                    color: isDone ? '#4ade80' : '#f59e0b',
                    wordWrap: { width: maxTextW, useAdvancedWrap: true }
                });

                card.add([bg, titleTxt, authorTxt, detailTxt]);

                if (!isDone) {
                    curY += detailTxt.height + 6;
                    const miniBarW = maxTextW - 10;
                    const miniBarH = 8;
                    const miniBarBg = this.add.rectangle(leftX + miniBarW / 2, curY + 4, miniBarW, miniBarH, 0x140c07)
                        .setStrokeStyle(1, 0x4a3525);
                    const fillW = Math.max(4, Math.floor(miniBarW * (item.percent / 100)));
                    const miniBarFill = this.add.rectangle(leftX + fillW / 2, curY + 4, fillW, miniBarH - 2, 0xd97706);
                    card.add([miniBarBg, miniBarFill]);
                }

                const rightX = cardW / 2 - 58;

                const badgeTxt = this.add.text(rightX, -cardH / 2 + 28, isDone ? "✅ Resuelta" : `⏳ ${item.percent}%`, {
                    fontFamily: 'sans-serif',
                    fontSize: '13px',
                    fontStyle: 'bold',
                    color: isDone ? '#4ade80' : '#f59e0b'
                }).setOrigin(0.5);

                const playBtnW = 86;
                const playBtnH = 36;
                const actionBtn = this.createButton(rightX, cardH / 2 - 28, isDone ? "Revisar" : "▶ Jugar", () => {
                    if (!this.hasMoved) {
                        this.scene.start('GameScene', { levels: this.levels, startLevelIdx: item.originalIndex });
                    }
                }, playBtnW, playBtnH, isDone ? 0x2e1e14 : 0x5a341e, isDone ? 0x6d5246 : 0xd97706, '14px');

                card.add([badgeTxt, actionBtn]);
                this.contentContainer.add(card);

                currentY += cardH + cardGap;
            });
        }

        const btnH = 46;
        const bottomBackBtn = this.createButton(width / 2, currentY + 30 + btnH / 2, "⬅ Volver al Inicio", () => {
            this.scene.start('MenuScene', { levels: this.levels });
        }, 200, btnH, 0x3a281c, 0x8d6e63, '15px');

        this.contentContainer.add(bottomBackBtn);

        const totalContentH = currentY + 30 + btnH + 50;
        this.maxScrollY = Math.max(0, totalContentH - height + 40);
    }

    createButton(x, y, text, callback, btnWidth = 70, btnHeight = 40, bgColor = 0x4a3525, strokeColor = 0x8d6e63, fontSize = '14px') {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, bgColor)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1.5, strokeColor);

        const txt = this.add.text(0, 0, text, {
            fontFamily: 'sans-serif',
            fontSize: fontSize,
            fontStyle: 'bold',
            color: '#fff8ea'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.setFillStyle(Phaser.Display.Color.IntegerToColor(bgColor).brighten(20).color);
        });

        bg.on('pointerup', () => {
            if (bg.active) bg.setFillStyle(bgColor);
            if (!this.hasMoved) {
                callback();
            }
        });

        bg.on('pointerout', () => {
            if (bg.active) bg.setFillStyle(bgColor);
        });

        container.add([bg, txt]);
        return container;
    }
}