class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.animate();
    }

    spawn(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                size: Math.random() * 3 + 1
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        requestAnimationFrame(() => this.animate());
    }
}

let editor;
let particleSystem;
const IMMERSIVE_FONT_SIZE = 48;
const CURSOR_THRESHOLD_RATIO = 0.70;
const SPOTLIGHT_RADIUS = 5;
let spotlightDecorations = [];

function initImmersive(value, language) {
    const container = document.getElementById('container');
    const canvas = document.getElementById('particle-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particleSystem = new ParticleSystem(canvas);

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.48.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monaco.editor.defineTheme('monochrome-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: { 'editor.background': '#0d0d0d' }
        });

        editor = monaco.editor.create(container, {
            value: value,
            language: language,
            theme: 'monochrome-dark',
            fontSize: IMMERSIVE_FONT_SIZE,
            lineHeight: IMMERSIVE_FONT_SIZE * 1.8,
            minimap: { enabled: false },
            scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
            cursorBlinking: 'phase',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            automaticLayout: true
        });

        editor.onDidChangeCursorPosition(e => {
            updateSpotlight(e.position.lineNumber);
            enforcePanning();
            updateTimeline(e.position.lineNumber);
            vscode.postMessage({ command: 'cursorChange', ln: e.position.lineNumber, col: e.position.column });
        });

        editor.onDidChangeModelContent(e => {
            vscode.postMessage({ command: 'change', value: editor.getValue() });
            const pos = editor.getPosition();
            const scrolledPos = editor.getScrolledVisiblePosition(pos);
            if (scrolledPos) {
                particleSystem.spawn(scrolledPos.left, scrolledPos.top + 10);
            }
        });

        updateSpotlight(1);
        updateTimeline(1);
        vscode.postMessage({ command: 'ready' });
    });
}

function updateSpotlight(lineNumber) {
    const model = editor.getModel();
    const totalLines = model.getLineCount();
    const newDecorations = [];

    for (let offset = 1; offset <= SPOTLIGHT_RADIUS; offset++) {
        const dimClass = `immersive-dim-${Math.min(offset, 5)}`;
        if (lineNumber - offset >= 1) {
            newDecorations.push({ range: new monaco.Range(lineNumber - offset, 1, lineNumber - offset, 1), options: { isWholeLine: true, className: dimClass } });
        }
        if (lineNumber + offset <= totalLines) {
            newDecorations.push({ range: new monaco.Range(lineNumber + offset, 1, lineNumber + offset, 1), options: { isWholeLine: true, className: dimClass } });
        }
    }
    spotlightDecorations = editor.deltaDecorations(spotlightDecorations, newDecorations);
}

function updateTimeline(lineNumber) {
    const totalLines = editor.getModel().getLineCount();
    const ratio = totalLines > 1 ? (lineNumber - 1) / (totalLines - 1) : 0;
    document.getElementById('timeline-indicator').style.top = (ratio * 100) + '%';
}

function enforcePanning() {
    const position = editor.getPosition();
    const scrolledPos = editor.getScrolledVisiblePosition(position);
    if (!scrolledPos) return;

    const layoutInfo = editor.getLayoutInfo();
    const contentWidth = layoutInfo.contentWidth;
    const thresholdRight = contentWidth * CURSOR_THRESHOLD_RATIO;
    const thresholdLeft = contentWidth * (1 - CURSOR_THRESHOLD_RATIO);

    const currentScrollLeft = editor.getScrollLeft();
    let targetScrollLeft = currentScrollLeft;

    if (scrolledPos.left > thresholdRight) {
        targetScrollLeft = currentScrollLeft + (scrolledPos.left - thresholdRight);
    } else if (scrolledPos.left < thresholdLeft) {
        targetScrollLeft = Math.max(0, currentScrollLeft - (thresholdLeft - scrolledPos.left));
    }

    if (targetScrollLeft !== currentScrollLeft) {
        editor.setScrollLeft(targetScrollLeft); // Simple set for now, can add animation later
    }
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'init') {
        initImmersive(message.value, message.language);
    }
});
