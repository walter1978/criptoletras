/**
 * Escena Principal del Tablero de Juego (Criptograma).
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.levels = (data && data.levels && data.levels.length > 0) ? data.levels : DEFAULT_LEVELS;
        this.currentLevelIdx = (data && typeof data.startLevelIdx === 'number')
            ? data.startLevelIdx
            : ProgressManager.getLastPlayedLevel();
        if (this.currentLevelIdx < 0 || this.currentLevelIdx >= this.levels.length) {
            this.currentLevelIdx = 0;
        }

        this.selectedCell = null;
        this.gridWidth = 8;
        this.cellViews = [];
        this.levelSessionId = 0;
        this.selectedHintWordIndices = new Set();
        this.hintNumbers = new Set();
        this.victoryModal = null;
        this.victoryPending = false;
        this.activeNotice = null;
        
        this.scrollY = 0;
        this.maxScrollY = 0;
        this.isDragging = false;
        this.dragStartY = 0;
        this.pointerDownPos = { x: 0, y: 0 };
        this.hasMoved = false;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x2a1c12);
        
        this.gridContainer = this.add.container(0, 0);
        this.headerGroup = this.add.container(0, 0);
        this.headerGroup.setDepth(10);

        this.keyboardGroup = this.add.container(0, 0);
        this.keyboardGroup.setDepth(100);
        this.keyboardGroup.setVisible(false);

        this.loadLevel(this.currentLevelIdx);

        this.input.keyboard.on('keydown', (event) => {
            if (this.victoryModal) return;
            if (!this.selectedCell) return;
            const key = event.key.toUpperCase();

            if (key === 'BACKSPACE' || key === 'DELETE') {
                this.inputLetter('DEL');
            } else if (key === 'ARROWRIGHT') {
                this.moveCursor(1);
            } else if (key === 'ARROWLEFT') {
                this.moveCursor(-1);
            } else if (/^[A-ZÑ]$/.test(key)) {
                this.inputLetter(key);
            }
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.victoryModal) return;
            if (this.keyboardGroup.visible && pointer.y > this.scale.height - 190) return;
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
            if (this.victoryModal) return;
            this.setScroll(this.scrollY - deltaY * 0.5);
        });

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });
        this.handleResize({ width: this.scale.width, height: this.scale.height });
    }

    setScroll(val) {
        this.scrollY = Phaser.Math.Clamp(val, -this.maxScrollY, 0);
        this.gridContainer.y = this.scrollY;
    }

    loadLevel(index) {
        if (!this.levels || this.levels.length === 0) return;
        if (this.victoryModal) {
            this.victoryModal.destroy();
            this.victoryModal = null;
        }

        this.levelSessionId++;
        this.victoryPending = false;
        this.currentLevelIdx = index;
        ProgressManager.setLastPlayedLevel(index);
        const levelData = this.levels[index];

        this.quoteText = cleanText(levelData.quote);
        this.authorText = cleanText(levelData.author);
        this.bookText = cleanText(levelData.book);

        this.buildCipherMap(levelData);
        this.setupRandomHints();

        this.selectedCell = null;
        this.keyboardGroup.setVisible(false);
        this.scrollY = 0;
        this.gridContainer.y = 0;

        this.isCurrentCompleted = ProgressManager.isLevelCompleted(levelData.id);
        this.currentSavedGuesses = ProgressManager.getLevelGuesses(levelData.id) || {};

        this.renderBoard();
    }

    setupRandomHints() {
        const words = this.quoteText.split(' ');
        const len = words.length;
        
        const midStart = Math.floor(len * 0.25);
        const midEnd = Math.floor(len * 0.75);
        
        const indexedWords = words.map((w, i) => ({ word: w, index: i }));
        
        let pool = indexedWords.slice(midStart, midEnd).filter(item => item.word.length >= 2 && item.word.length <= 6);
        if (pool.length === 0) {
            pool = indexedWords.filter(item => item.word.length >= 2 && item.word.length <= 6);
        }
        if (pool.length === 0) {
            pool = indexedWords.filter(item => item.word.length >= 1);
        }

        const chosen = pool[Math.floor(Math.random() * pool.length)];

        this.selectedHintWordIndices = new Set();
        this.hintNumbers = new Set();

        if (chosen) {
            this.selectedHintWordIndices.add(chosen.index);
            for (let char of chosen.word) {
                if (this.charToNumber && this.charToNumber[char]) {
                    this.hintNumbers.add(this.charToNumber[char]);
                }
            }
        }
    }

    buildCipherMap(levelData) {
        const fullText = this.quoteText + " " + this.authorText + " " + this.bookText;
        const uniqueChars = Array.from(new Set(fullText.replace(/\s/g, '').split(''))).sort();
        
        const numbers = Array.from({length: 27}, (_, i) => i + 1);
        let seed = (this.currentLevelIdx + 1) * 123;
        numbers.sort(() => (Math.sin(seed++) - 0.5));

        this.charToNumber = {};
        this.numberToChar = {};

        uniqueChars.forEach((char, idx) => {
            const num = numbers[idx % numbers.length];
            this.charToNumber[char] = num;
            this.numberToChar[num] = char;
        });
    }

    formatQuoteGridData(text, width) {
        const words = text.split(' ');
        const rows = [];
        let currentRow = [];

        words.forEach((word, wordIdx) => {
            const wordChars = word.split('').map(char => ({ char, wordIdx }));

            if (wordChars.length > width) {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    currentRow = [];
                }
                for (let i = 0; i < wordChars.length; i += width) {
                    const chunk = wordChars.slice(i, i + width);
                    if (i + width >= wordChars.length) {
                        currentRow = chunk;
                    } else {
                        rows.push(chunk);
                    }
                }
                return;
            }

            if (currentRow.length === 0) {
                currentRow = wordChars;
            } else {
                if (currentRow.length + 1 + wordChars.length <= width) {
                    currentRow.push({ char: ' ', wordIdx: -1 });
                    currentRow.push(...wordChars);
                } else {
                    rows.push(currentRow);
                    currentRow = wordChars;
                }
            }
        });
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        return rows.map(row => {
            const padded = [...row];
            while (padded.length < width) {
                padded.push({ char: ' ', wordIdx: -1 });
            }
            return padded;
        });
    }

    formatTextToGrid(text, width) {
        const words = text.split(' ');
        const rows = [];
        let currentRow = '';

        words.forEach(word => {
            if (word.length > width) {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    currentRow = '';
                }
                for (let i = 0; i < word.length; i += width) {
                    rows.push(word.substring(i, i + width));
                }
            } else {
                const testRow = currentRow === '' ? word : currentRow + ' ' + word;
                if (testRow.length <= width) {
                    currentRow = testRow;
                } else {
                    rows.push(currentRow);
                    currentRow = word;
                }
            }
        });
        if (currentRow !== '') {
            rows.push(currentRow);
        }
        return rows;
    }

    renderBoard() {
        this.gridContainer.removeAll(true);
        this.cellViews = [];

        this.quoteGridRows = this.formatQuoteGridData(this.quoteText, this.gridWidth);
        this.authorRows = this.formatTextToGrid(this.authorText, this.gridWidth);
        this.bookRows = this.formatTextToGrid(this.bookText, this.gridWidth);

        this.drawUI();
    }

    drawUI() {
        const { width, height } = this.scale;
        
        this.headerGroup.removeAll(true);

        const headerBg = this.add.rectangle(width / 2, 59, width, 118, 0x1a110a);
        const headerBorder = this.add.rectangle(width / 2, 118, width, 2, 0x3d271d);
        
        const isCompleted = ProgressManager.isLevelCompleted(this.levels[this.currentLevelIdx].id);

        const title = this.add.text(width / 2, 18, TEXTS.game.title, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: Math.min(26, Math.max(18, Math.floor(width * 0.065))) + 'px',
            fontStyle: 'bold',
            color: '#f3e5ab'
        }).setOrigin(0.5);

        const levelInfoStr = TEXTS.game.levelNumber(this.currentLevelIdx + 1) + (isCompleted ? TEXTS.game.resolvedBadge : "");
        const levelInfo = this.add.text(width / 2, 42, levelInfoStr, {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: isCompleted ? '#4ade80' : '#cbb69d'
        }).setOrigin(0.5);

        this.headerGroup.add([headerBg, headerBorder, title, levelInfo]);

        const btnY = 78;
        const totalBtns = 5;
        const padding = 12;
        const availableWidth = width - (padding * 2);
        const gap = 6;
        const btnWidth = Math.min(75, Math.floor((availableWidth - (totalBtns - 1) * gap) / totalBtns));
        const btnHeight = 38;
        const totalBarWidth = totalBtns * btnWidth + (totalBtns - 1) * gap;
        const startBarX = (width - totalBarWidth) / 2;

        const buttonsData = [
            { text: "🏠", cb: () => this.goToMenu() },
            { text: "◀", cb: () => this.changeLevel(-1) },
            { text: "▶", cb: () => this.changeLevel(1) },
            { text: "💡", cb: () => this.giveHint() },
            { text: "🔓", cb: () => this.solveAll() }
        ];

        buttonsData.forEach((b, idx) => {
            const x = startBarX + idx * (btnWidth + gap) + (btnWidth / 2);
            const btn = this.createButton(x, btnY, b.text, b.cb, btnWidth, btnHeight);
            this.headerGroup.add(btn);
        });

        this.gridContainer.removeAll(true);

        const sidePadding = 8;
        let cellSize = Math.floor((width - sidePadding * 2) / this.gridWidth);
        cellSize = Math.max(8, Math.min(cellSize, 64));

        const gridX = (width - (this.gridWidth * cellSize)) / 2;
        let startY = 126;

        let globalFlatIndex = 0;

        this.quoteGridRows.forEach((rowCells, rIdx) => {
            rowCells.forEach((cellObj, cIdx) => {
                const char = cellObj.char;
                const wordIdx = cellObj.wordIdx;
                const cellX = gridX + cIdx * cellSize;
                const cellY = startY + rIdx * cellSize;

                let isHint = (wordIdx !== -1 && this.selectedHintWordIndices && this.selectedHintWordIndices.has(wordIdx));
                this.createCell(cellX, cellY, cellSize, char, globalFlatIndex++, isHint);
            });
        });

        let currentY = startY + (this.quoteGridRows.length * cellSize) + 20;
        
        const authorLabel = this.add.text(width / 2, currentY, TEXTS.game.authorLabel, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '36px',
            color: '#e0c097',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.gridContainer.add(authorLabel);

        currentY += 34;

        this.authorRows.forEach((rowStr, rIdx) => {
            for (let cIdx = 0; cIdx < this.gridWidth; cIdx++) {
                const char = rowStr[cIdx] || ' ';
                const cellX = gridX + cIdx * cellSize;
                const cellY = currentY + rIdx * cellSize;
                this.createCell(cellX, cellY, cellSize, char, globalFlatIndex++, false);
            }
        });

        currentY += this.authorRows.length * cellSize + 20;

        const bookLabel = this.add.text(width / 2, currentY, TEXTS.game.bookLabel, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '36px',
            color: '#e0c097',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.gridContainer.add(bookLabel);

        currentY += 34;

        this.bookRows.forEach((rowStr, rIdx) => {
            for (let cIdx = 0; cIdx < this.gridWidth; cIdx++) {
                const char = rowStr[cIdx] || ' ';
                const cellX = gridX + cIdx * cellSize;
                const cellY = currentY + rIdx * cellSize;
                this.createCell(cellX, cellY, cellSize, char, globalFlatIndex++, false);
            }
        });

        const totalBoardHeight = currentY + (this.bookRows.length * cellSize) + 40;
        this.maxScrollY = Math.max(0, totalBoardHeight - height + 200);

        this.drawKeyboard(width, height);
    }

    createCell(x, y, size, char, flatIndex, isHintWord = false) {
        const isBlack = (char === ' ');
        const num = isBlack ? null : this.charToNumber[char];
        const isHint = isHintWord || (!isBlack && this.hintNumbers && this.hintNumbers.has(num));

        let initialChar = '';
        let textColor = '#000000';

        if (isHint) {
            initialChar = char;
            textColor = '#7c3f00';
        } else if (this.isCurrentCompleted) {
            initialChar = char;
            textColor = '#15803d';
        } else if (this.currentSavedGuesses && this.currentSavedGuesses[flatIndex]) {
            initialChar = this.currentSavedGuesses[flatIndex];
            textColor = '#000000';
        }

        const bg = this.add.rectangle(x + size / 2, y + size / 2, size - 3, size - 3, isBlack ? 0x120a06 : 0xfff8ea);
        bg.setStrokeStyle(1.5, isBlack ? 0x3d271d : 0x8d6e63);

        const cellData = {
            flatIndex,
            x, y, size,
            char,
            num,
            isBlack,
            bg,
            userChar: initialChar,
            isHint,
            numText: null,
            charText: null
        };

        if (!isBlack) {
            bg.setInteractive({ useHandCursor: true });
            
            bg.on('pointerup', () => {
                if (!this.hasMoved) {
                    this.selectCell(cellData);
                }
            });

            const numText = this.add.text(x + 4, y + 3, num.toString(), {
                fontFamily: 'sans-serif',
                fontSize: `${Math.max(10, Math.floor(size * 0.3))}px`,
                color: '#5d4037'
            });

            const charText = this.add.text(x + size / 2, y + size * 0.62, initialChar, {
                fontFamily: 'sans-serif',
                fontSize: `${Math.max(16, Math.floor(size * 0.55))}px`,
                fontStyle: 'bold',
                color: textColor
            }).setOrigin(0.5);

            cellData.numText = numText;
            cellData.charText = charText;

            this.gridContainer.add([bg, numText, charText]);
        } else {
            this.gridContainer.add(bg);
        }

        this.cellViews.push(cellData);
    }

    selectCell(cell) {
        if (cell.isBlack || this.victoryModal) return;

        if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
            this.selectedCell.bg.setStrokeStyle(1.5, 0x8d6e63);
        }

        this.selectedCell = cell;
        cell.bg.setStrokeStyle(2.5, 0x0088ff);

        this.cellViews.forEach(c => {
            if (!c.isBlack && c.bg && c.bg.active) {
                if (c === cell) {
                    c.bg.setFillStyle(0xdbeafe);
                } else {
                    c.bg.setFillStyle(0xfff8ea);
                }
            }
        });

        this.keyboardGroup.setVisible(true);

        const keyboardTopY = this.scale.height - 195;
        const cellScreenY = cell.y + this.scrollY;

        if (cellScreenY > keyboardTopY - cell.size) {
            const targetScroll = -(cell.y - (keyboardTopY - cell.size - 20));
            this.setScroll(targetScroll);
        } else if (cellScreenY < 126) {
            const targetScroll = -(cell.y - 135);
            this.setScroll(targetScroll);
        }

        const currentLevel = this.levels[this.currentLevelIdx];
        if (currentLevel && !ProgressManager.isLevelCompleted(currentLevel.id) && !ProgressManager.isLevelStarted(currentLevel.id)) {
            this.saveCurrentGuesses();
        }
    }

    saveCurrentGuesses() {
        const level = this.levels[this.currentLevelIdx];
        if (!level || ProgressManager.isLevelCompleted(level.id)) return;
        const guesses = {};
        let correctCount = 0;
        let totalCount = 0;

        this.cellViews.forEach(c => {
            if (!c.isBlack) {
                totalCount++;
                if (c.userChar) {
                    guesses[c.flatIndex] = c.userChar;
                    if (c.userChar === c.char) {
                        correctCount++;
                    }
                }
            }
        });

        const percent = totalCount > 0
            ? Math.min(99, Math.max(1, Math.round((correctCount / totalCount) * 100)))
            : 0;

        ProgressManager.saveLevelProgress(level.id, {
            guesses,
            correctCount,
            totalCount,
            percent
        });
    }

    playTypewriterSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300 + Math.random() * 150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);
            
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.03);

            const bufferSize = ctx.sampleRate * 0.02;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1200;
            
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            
            noise.start();
            noise.stop(ctx.currentTime + 0.02);
        } catch(e) {}
    }

    playErrorSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, ctx.currentTime);
            osc.frequency.setValueAtTime(90, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }

    inputLetter(letter) {
        if (this.victoryModal) return;
        if (!this.selectedCell || !this.selectedCell.charText || !this.selectedCell.charText.active) return;

        const targetNum = this.selectedCell.num;

        if (letter === 'DEL') {
            if (this.selectedCell.isHint) {
                this.playErrorSound();
                this.showNotice(TEXTS.game.notices.cantDeleteHint);
                return;
            }

            this.playTypewriterSound();
            this.cellViews.forEach(c => {
                if (!c.isBlack && c.num === targetNum && !c.isHint) {
                    c.userChar = '';
                    if (c.charText && c.charText.active) {
                        c.charText.setText('');
                    }
                }
            });
            this.moveCursor(-1);
        } else {
            if (this.selectedCell.isHint) {
                this.playErrorSound();
                this.showNotice(TEXTS.game.notices.fixedHint);
                return;
            }

            let letraYaUsadaEnOtroNumero = false;

            for (let c of this.cellViews) {
                if (!c.isBlack && c.num !== targetNum && c.userChar === letter) {
                    letraYaUsadaEnOtroNumero = true;
                    break;
                }
            }

            if (letraYaUsadaEnOtroNumero) {
                this.playErrorSound();
                this.showNotice(TEXTS.game.notices.letterAlreadyUsed);

                if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
                    this.tweens.add({
                        targets: this.selectedCell.bg,
                        fillColor: 0xd32f2f,
                        duration: 250,
                        yoyo: true,
                        repeat: 1,
                        onComplete: () => {
                            if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
                                this.selectedCell.bg.setFillStyle(0xdbeafe);
                            }
                        }
                    });
                }
                return;
            }

            this.playTypewriterSound();
            this.cellViews.forEach(c => {
                if (!c.isBlack && c.num === targetNum && !c.isHint) {
                    c.userChar = letter;
                    if (c.charText && c.charText.active) {
                        c.charText.setText(letter);
                        c.charText.setColor('#000000');
                    }
                }
            });
            this.moveCursor(1);
        }

        this.saveCurrentGuesses();
        this.checkVictory();
    }

    moveCursor(dir) {
        if (!this.selectedCell) return;
        let currentIndex = this.cellViews.findIndex(c => c === this.selectedCell);
        
        let nextIndex = currentIndex + dir;
        while (nextIndex >= 0 && nextIndex < this.cellViews.length) {
            if (!this.cellViews[nextIndex].isBlack) {
                this.selectCell(this.cellViews[nextIndex]);
                break;
            }
            nextIndex += dir;
        }
    }

    drawKeyboard(width, height) {
        this.keyboardGroup.removeAll(true);

        const rows = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L','Ñ'],
            ['Z','X','C','V','B','N','M','DEL']
        ];

        const keyMargin = 4;
        const maxKeysInRow = 10;
        const keyWidth = Math.min(38, Math.floor((width - 24) / maxKeysInRow));
        const keyHeight = 40;

        const topBarHeight = 44;
        const keyboardHeight = topBarHeight + (keyHeight + keyMargin) * 3 + 18;
        const startY = height - keyboardHeight;

        const panelBg = this.add.rectangle(width / 2, startY + keyboardHeight / 2, width, keyboardHeight, 0x140c07, 0.95)
            .setInteractive();
        panelBg.setStrokeStyle(2, 0x8d6e63);

        const closeKeyWidth = keyWidth;
        const closeKeyHeight = 36;
        const closeX = width - closeKeyWidth / 2 - 12;
        const closeY = startY + topBarHeight / 2;

        const closeBg = this.add.rectangle(closeX, closeY, closeKeyWidth, closeKeyHeight, 0x8b0000)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x6d5246);

        const closeTxt = this.add.text(closeX, closeY, '✖', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        closeBg.on('pointerdown', () => {
            closeBg.setFillStyle(0xa00000);
            this.keyboardGroup.setVisible(false);
            if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
                this.selectedCell.bg.setStrokeStyle(1.5, 0x8d6e63);
                this.selectedCell.bg.setFillStyle(0xfff8ea);
                this.selectedCell = null;
            }
        });
        closeBg.on('pointerup', () => {
            closeBg.setFillStyle(0x8b0000);
        });

        this.keyboardGroup.add([panelBg, closeBg, closeTxt]);

        const keyStartY = startY + topBarHeight + 2;

        rows.forEach((row, rIdx) => {
            const rowWidth = row.length * (keyWidth + keyMargin);
            const startX = (width - rowWidth) / 2;

            row.forEach((key, kIdx) => {
                const kx = startX + kIdx * (keyWidth + keyMargin);
                const ky = keyStartY + rIdx * (keyHeight + keyMargin);

                const isDel = key === 'DEL';
                const kw = isDel ? keyWidth * 1.5 : keyWidth;

                const btnBg = this.add.rectangle(kx + kw / 2, ky + keyHeight / 2, kw, keyHeight, isDel ? 0x8b0000 : 0x3a2e2b)
                    .setInteractive({ useHandCursor: true });
                
                btnBg.setStrokeStyle(1, 0x6d5246);

                const btnText = this.add.text(kx + kw / 2, ky + keyHeight / 2, key, {
                    fontFamily: 'sans-serif',
                    fontSize: isDel ? '10px' : '14px',
                    fontStyle: 'bold',
                    color: '#ffffff'
                }).setOrigin(0.5);

                btnBg.on('pointerdown', () => {
                    btnBg.setFillStyle(0x5c4238);
                    this.inputLetter(key);
                });

                btnBg.on('pointerup', () => {
                    btnBg.setFillStyle(isDel ? 0x8b0000 : 0x3a2e2b);
                });

                this.keyboardGroup.add([btnBg, btnText]);
            });
        });
    }

    createButton(x, y, text, callback, btnWidth = 70, btnHeight = 40, bgColor = 0x4a3525, strokeColor = 0x8d6e63) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, bgColor)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1.5, strokeColor);

        const txt = this.add.text(0, 0, text, {
            fontFamily: 'sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#fff8ea'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.setFillStyle(Phaser.Display.Color.IntegerToColor(bgColor).brighten(20).color);
        });

        bg.on('pointerup', () => {
            if (bg.active) bg.setFillStyle(bgColor);
            callback();
        });

        bg.on('pointerout', () => {
            if (bg.active) bg.setFillStyle(bgColor);
        });

        container.add([bg, txt]);
        return container;
    }

    giveHint() {
        if (this.victoryModal) return;
        const availableCells = this.cellViews.filter(c => !c.isBlack && c.userChar !== c.char);
        if (availableCells.length === 0) return;

        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        const targetNum = randomCell.num;
        const targetChar = randomCell.char;

        this.hintNumbers.add(targetNum);

        this.cellViews.forEach(c => {
            if (!c.isBlack && c.num === targetNum) {
                c.userChar = targetChar;
                c.isHint = true;
                if (c.charText && c.charText.active) {
                    c.charText.setText(targetChar);
                    c.charText.setColor('#7c3f00');
                }
                if (c.bg && c.bg.active) {
                    c.bg.setFillStyle(0xdbeafe);
                    this.time.delayedCall(400, () => {
                        if (c.bg && c.bg.active) {
                            c.bg.setFillStyle(0xfff8ea);
                        }
                    });
                }
            }
        });

        this.saveCurrentGuesses();
        this.checkVictory();
    }

    solveAll() {
        if (this.victoryModal || this.victoryPending) return;
        this.keyboardGroup.setVisible(false);
        if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
            this.selectedCell.bg.setStrokeStyle(1.5, 0x8d6e63);
            this.selectedCell.bg.setFillStyle(0xfff8ea);
            this.selectedCell = null;
        }

        const validCells = this.cellViews.filter(c => !c.isBlack);

        validCells.forEach(c => { c.userChar = c.char; });

        const currentSession = this.levelSessionId;
        validCells.forEach((c, index) => {
            this.time.delayedCall(index * 2, () => {
                if (this.levelSessionId !== currentSession) return;
                if (!c.charText || !c.charText.active || !c.bg || !c.bg.active) return;

                c.charText.setText(c.char);
                c.charText.setColor(c.isHint ? '#7c3f00' : '#000000');
                c.bg.setFillStyle(0xfff8ea);
                c.bg.setStrokeStyle(1.5, 0x8d6e63);
            });
        });

        this.checkVictory(Math.max(250, validCells.length * 2 + 150));
    }

    checkVictory(modalDelay = 250) {
        if (this.victoryPending) return;

        let allCorrect = true;
        for (let c of this.cellViews) {
            if (!c.isBlack && c.userChar !== c.char) {
                allCorrect = false;
                break;
            }
        }

        if (allCorrect) {
            this.victoryPending = true;

            const currentLevel = this.levels[this.currentLevelIdx];
            ProgressManager.markLevelCompleted(currentLevel.id);
            ProgressManager.clearLevelGuesses(currentLevel.id);
            this.isCurrentCompleted = true;

            const solvedCount = ProgressManager.getCompletedCount(this.levels);
            const totalCount = this.levels.length;
            const currentSession = this.levelSessionId;

            this.time.delayedCall(modalDelay, () => {
                if (this.levelSessionId !== currentSession) return;
                this.showVictoryModal(currentLevel, solvedCount, totalCount);
            });
        }
    }

    showVictoryModal(level, solvedCount, totalCount) {
        if (this.victoryModal) {
            this.victoryModal.destroy();
        }

        this.keyboardGroup.setVisible(false);
        if (this.selectedCell && this.selectedCell.bg && this.selectedCell.bg.active) {
            this.selectedCell.bg.setStrokeStyle(1.5, 0x8d6e63);
            this.selectedCell.bg.setFillStyle(0xfff8ea);
            this.selectedCell = null;
        }

        const { width, height } = this.scale;
        this.victoryModal = this.add.container(0, 0);
        this.victoryModal.setDepth(200);

        const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
            .setInteractive();

        const modalW = Math.min(width - 32, 420);
        const modalH = Math.min(height - 40, 420);
        const modalX = width / 2;
        const modalY = height / 2;

        const box = this.add.rectangle(modalX, modalY, modalW, modalH, 0x251810)
            .setStrokeStyle(2.5, 0xd97706);

        let contentY = modalY - modalH / 2 + 25;

        const title = this.add.text(modalX, contentY, TEXTS.game.victory.title, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#f3e5ab'
        }).setOrigin(0.5);

        contentY += 28;

        const subtitle = this.add.text(modalX, contentY, TEXTS.game.victory.subtitle, {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            color: '#d7ccc8'
        }).setOrigin(0.5);

        contentY += 26;

        const quoteBoxW = modalW - 32;
        const quoteText = this.add.text(modalX, contentY, `“${level.quote}”`, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: quoteBoxW - 20, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);

        contentY += quoteText.height + 8;

        const authorText = this.add.text(modalX, contentY, `— ${level.author}\n(${level.book})`, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#e0c097',
            align: 'center'
        }).setOrigin(0.5, 0);

        contentY += authorText.height + 16;

        const progressBg = this.add.rectangle(modalX, contentY + 16, quoteBoxW, 34, 0x170e09)
            .setStrokeStyle(1, 0x5c4238);

        const progressText = this.add.text(modalX, contentY + 16, TEXTS.game.victory.solvedCount(solvedCount), {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#4ade80'
        }).setOrigin(0.5);

        contentY += 46;

        const btnW = Math.min(quoteBoxW, 260);
        const btnH = 36;

        const nextBtn = this.createButton(modalX, contentY + btnH / 2, TEXTS.game.victory.nextBtn, () => {
            this.victoryModal.destroy();
            this.victoryModal = null;
            this.changeLevel(1);
        }, btnW, btnH, 0x5a341e, 0xd97706);

        contentY += btnH + 10;

        const progBtn = this.createButton(modalX, contentY + btnH / 2, TEXTS.game.victory.progressBtn, () => {
            this.victoryModal.destroy();
            this.victoryModal = null;
            this.scene.start('ProgressScene', { levels: this.levels });
        }, btnW, btnH, 0x3a281c, 0x8d6e63);

        contentY += btnH + 10;

        const menuBtn = this.createButton(modalX, contentY + btnH / 2, TEXTS.game.victory.menuBtn, () => {
            this.victoryModal.destroy();
            this.victoryModal = null;
            this.scene.start('MenuScene', { levels: this.levels });
        }, btnW, btnH, 0x2e1e14, 0x6d5246);

        this.victoryModal.add([
            backdrop, box, title, subtitle, quoteText, authorText,
            progressBg, progressText, nextBtn, progBtn, menuBtn
        ]);
    }

    goToMenu() {
        if (this.victoryModal) {
            this.victoryModal.destroy();
            this.victoryModal = null;
        }
        this.scene.start('MenuScene', { levels: this.levels });
    }

    changeLevel(dir) {
        if (!this.levels || this.levels.length === 0) return;
        
        if (dir > 0) {
            const currentLevel = this.levels[this.currentLevelIdx];
            const isCompleted = ProgressManager.isLevelCompleted(currentLevel.id);

            if (!isCompleted) {
                this.showNotice(TEXTS.game.notices.completeCurrentFirst);
                return;
            }
        }

        if (dir < 0) {
            let targetIdx = this.currentLevelIdx + dir;
            if (targetIdx < 0) targetIdx = this.levels.length - 1;

            const targetLevel = this.levels[targetIdx];
            const isTargetCompleted = ProgressManager.isLevelCompleted(targetLevel.id);

            if (!isTargetCompleted) {
                this.showNotice(TEXTS.game.notices.cantGoBackUncompleted);
                return;
            }
        }

        if (this.victoryModal) {
            this.victoryModal.destroy();
            this.victoryModal = null;
        }

        let newIdx = this.currentLevelIdx + dir;
        if (newIdx < 0) newIdx = this.levels.length - 1;
        if (newIdx >= this.levels.length) newIdx = 0;
        this.loadLevel(newIdx);
    }

    showNotice(message) {
        if (this.activeNotice) {
            this.activeNotice.destroy();
        }

        const { width, height } = this.scale;
        const maxBoxW = Math.min(width - 32, 380);

        const noticeText = this.add.text(0, 0, message, {
            fontFamily: 'Georgia, Garamond, serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#f3e5ab',
            align: 'center',
            wordWrap: { width: maxBoxW - 24, useAdvancedWrap: true }
        }).setOrigin(0.5).setDepth(2001);

        const textH = noticeText.height;
        const boxH = Math.max(50, textH + 24);
        const posY = height / 2;

        const noticeBg = this.add.rectangle(0, 0, maxBoxW, boxH, 0x1a110a, 0.95)
            .setStrokeStyle(2, 0xd97706)
            .setDepth(2000);

        const container = this.add.container(width / 2, posY, [noticeBg, noticeText]);
        container.setDepth(2000);

        this.activeNotice = container;

        this.time.delayedCall(2800, () => {
            if (this.activeNotice) {
                this.activeNotice.destroy();
                this.activeNotice = null;
            }
        });
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.cameras.resize(width, height);
        this.drawUI();
    }
}