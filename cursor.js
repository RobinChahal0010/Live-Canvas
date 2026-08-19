/**
 * Custom Cursor for LiveCanvas
 * Replicates the home page cursor across all pages
 */
(function () {
    // Inject custom cursor CSS
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
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            width: 32px;
            height: 32px;
        }
    `;
    document.head.appendChild(style);

    function initCursor() {
        let cursor = document.getElementById('customCursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'custom-cursor';
            cursor.id = 'customCursor';
            cursor.innerHTML = `
                <svg class="cursor-pointer" viewBox="0 0 24 24" fill="none">
                    <path d="M4.15 2.5 L20.35 11.2 L12.8 12.8 L11.2 20.35 Z" fill="currentColor" stroke="white"
                        stroke-width="1.5" stroke-linejoin="round" />
                </svg>
            `;
            document.body.appendChild(cursor);
        }

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
            cursor.style.display = 'flex';
        });

        document.addEventListener('mouseleave', () => {
            cursor.style.display = 'none';
        });

        document.addEventListener('mouseenter', () => {
            cursor.style.display = 'flex';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCursor);
    } else {
        initCursor();
    }
})();
