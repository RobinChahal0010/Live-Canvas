/**
 * Custom Cursor for LiveCanvas
 * Replicates the home page cursor across all pages
 * On CANVAS PAGE (index.html): Colored cursor + "Me" badge for local user
 * On SAVED PAGE (saved.html) & others: Sleek BLACK cursor, NO badge
 */
(function () {
    const CURSOR_COLORS = [
        "#9900ff", // Boop Purple
        "#ff0080", // Bubble Pink
        "#0070f3", // Blue
        "#10b981", // Green
        "#ff6600", // Orange
        "#8b5cf6", // Violet
        "#06b6d4", // Cyan
        "#ec4899", // Rose
        "#f59e0b"  // Amber
    ];

    function getDeterministicColor(str) {
        if (!str) return CURSOR_COLORS[0];
        let hash = 0;
        const clean = str.trim().toLowerCase();
        for (let i = 0; i < clean.length; i++) {
            hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
        }
        return CURSOR_COLORS[hash % CURSOR_COLORS.length];
    }

    // Determine if we are on the canvas page
    function isCanvasPage() {
        return (
            window.location.pathname.endsWith("index.html") ||
            new URLSearchParams(window.location.search).has("board") ||
            !!document.getElementById("drawingBoard")
        );
    }

    // Inject custom cursor CSS if not already present
    if (!document.getElementById('custom-cursor-style')) {
        const style = document.createElement('style');
        style.id = 'custom-cursor-style';
        style.textContent = `
            * {
                cursor: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), none !important;
            }

            .custom-cursor {
                position: fixed;
                pointer-events: none;
                z-index: 999999;
                display: flex;
                align-items: flex-start;
                color: #111;
                left: -100px;
                top: -100px;
                transition: color 0.2s ease;
            }

            .cursor-pointer {
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
                width: 32px;
                height: 32px;
                flex-shrink: 0;
            }

            .cursor-label {
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                margin-left: 2px;
                margin-top: 18px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s ease;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
                color: #ffffff;
                background-color: currentColor;
                font-family: 'Poppins', 'Outfit', sans-serif;
                pointer-events: none;
                user-select: none;
            }

            .custom-cursor.show-label .cursor-label {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    let cursorEl = null;
    let labelEl = null;

    function initCursor() {
        cursorEl = document.getElementById('customCursor');
        if (!cursorEl) {
            cursorEl = document.createElement('div');
            cursorEl.className = 'custom-cursor';
            cursorEl.id = 'customCursor';
            cursorEl.innerHTML = `
                <svg class="cursor-pointer" viewBox="0 0 24 24" fill="none">
                    <path d="M4.15 2.5 L20.35 11.2 L12.8 12.8 L11.2 20.35 Z" fill="currentColor" stroke="white"
                        stroke-width="1.5" stroke-linejoin="round" />
                </svg>
                <div class="cursor-label" id="cursorLabel"></div>
            `;
            document.body.appendChild(cursorEl);
        }

        labelEl = document.getElementById('cursorLabel') || cursorEl.querySelector('.cursor-label');

        if (isCanvasPage()) {
            let userName = '';
            try {
                const user = JSON.parse(localStorage.getItem('loggedInUser'));
                if (user) {
                    userName = user.name || user.email?.split('@')[0] || '';
                }
            } catch (e) {}

            const color = getDeterministicColor(userName || 'Me');
            window.updateLocalCursor(userName || 'Me', color);
        } else {
            cursorEl.style.color = '#111';
            cursorEl.classList.remove('show-label');
            if (labelEl) labelEl.textContent = '';
        }

        document.addEventListener('mousemove', (e) => {
            if (cursorEl) {
                cursorEl.style.left = `${e.clientX}px`;
                cursorEl.style.top = `${e.clientY}px`;
                cursorEl.style.display = 'flex';
            }
        });

        document.addEventListener('mouseleave', () => {
            if (cursorEl) cursorEl.style.display = 'none';
        });

        document.addEventListener('mouseenter', () => {
            if (cursorEl) cursorEl.style.display = 'flex';
        });
    }

    window.updateLocalCursor = function (name, color) {
        if (!cursorEl) cursorEl = document.getElementById('customCursor');
        if (!labelEl && cursorEl) labelEl = cursorEl.querySelector('.cursor-label');
        if (!cursorEl || !labelEl) return;

        // ONLY allow colored cursor + "Me" label on the canvas page
        if (!isCanvasPage()) {
            cursorEl.style.color = '#111';
            cursorEl.classList.remove('show-label');
            return;
        }

        const finalColor = color || getDeterministicColor(name || 'Me');
        cursorEl.style.color = finalColor;
        labelEl.style.backgroundColor = finalColor;
        labelEl.textContent = 'Me';
        cursorEl.classList.add('show-label');
    };

    window.getDeterministicCollabColor = getDeterministicColor;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCursor);
    } else {
        initCursor();
    }
})();
