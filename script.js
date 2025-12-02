/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Initializes all page-specific scripts. This function is called on initial
 * page load and after each page transition to ensure interactivity on new content.
 */
function initPageSpecificScripts() {
    // --- Scroll Animation Logic ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.1
    });
    animatedElements.forEach(element => observer.observe(element));

    // --- Accordion Logic ---
    const accordionButtons = document.querySelectorAll('.accordion-button');

    accordionButtons.forEach(button => {
        // Prevent re-attaching listeners on page transitions
        if (button.dataset.accordionInitialized) return;
        button.dataset.accordionInitialized = 'true';

        button.addEventListener('click', () => {
            const accordionContainer = button.closest('.accordion-container');
            const allButtons = accordionContainer.querySelectorAll('.accordion-button');
            const content = button.nextElementSibling;
            const isAlreadyActive = button.classList.contains('active');

            // Close all other accordions in the same container
            allButtons.forEach(otherButton => {
                if (otherButton !== button && otherButton.classList.contains('active')) {
                    otherButton.classList.remove('active');
                    otherButton.setAttribute('aria-expanded', 'false');
                    otherButton.nextElementSibling.style.maxHeight = null;
                }
            });

            // Toggle the clicked one
            if (!isAlreadyActive) {
                button.classList.add('active');
                button.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = null;
            }
        });
    });

    // Adjust maxHeight on window resize for active accordions.
    // Use a global flag to attach the listener only once.
    if (!window.accordionResizeListener) {
        window.addEventListener('resize', () => {
            document.querySelectorAll('.accordion-button.active').forEach(button => {
                const content = button.nextElementSibling;
                content.style.maxHeight = content.scrollHeight + 'px';
            });
        });
        window.accordionResizeListener = true;
    }

    // --- Tab Logic ---
    document.querySelectorAll('.tab-container').forEach(container => {
        const tabs = container.querySelectorAll('.tab-item');
        const panels = container.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            // Prevent re-attaching listeners on page transitions
            if (tab.dataset.tabInitialized) return;
            tab.dataset.tabInitialized = 'true';

            tab.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = tab.getAttribute('aria-controls');

                // Deactivate all tabs and panels in this container
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                    t.setAttribute('tabindex', '-1');
                });
                panels.forEach(p => {
                    p.classList.remove('active');
                    p.setAttribute('hidden', '');
                });

                // Activate the clicked tab and its corresponding panel
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');

                const targetPanel = container.querySelector(`#${targetId}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    targetPanel.removeAttribute('hidden');
                }
            });
        });
    });

    // --- Audio Player Logic ---
    const audio = document.getElementById('tdp-song-main');
    const playBtn = document.getElementById('play-pause-btn-main');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const timeDisplay = document.getElementById('time-display');

    if (audio && playBtn) {
        const playIcon = 'play_arrow';
        const pauseIcon = 'pause';

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.querySelector('.material-symbols-outlined').textContent = pauseIcon;
            } else {
                audio.pause();
                playBtn.querySelector('.material-symbols-outlined').textContent = playIcon;
            }
        });

        audio.addEventListener('timeupdate', () => {
            const { currentTime, duration } = audio;
            if (duration) {
                const progressPercent = (currentTime / duration) * 100;
                if (progressBar) progressBar.style.width = `${progressPercent}%`;

                // Update time display
                const minutes = Math.floor(currentTime / 60);
                const seconds = Math.floor(currentTime % 60);
                if (timeDisplay) timeDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const width = progressContainer.clientWidth;
                const clickX = e.offsetX;
                const duration = audio.duration;
                if (duration) {
                    audio.currentTime = (clickX / width) * duration;
                }
            });
        }

        audio.addEventListener('ended', () => {
            playBtn.querySelector('.material-symbols-outlined').textContent = playIcon;
            if (progressBar) progressBar.style.width = '0%';
            if (timeDisplay) timeDisplay.textContent = '0:00';
        });
    }
}

/**
 * Performs a smooth transition to a new page.
 * @param {string} url The URL of the page to transition to.
 */
async function performTransition(url) {
    const overlay = document.getElementById('transition-overlay');
    if (!overlay) return;

    // Fade in the overlay
    overlay.classList.remove('opacity-0', 'pointer-events-none');

    // Wait for the fade-in animation to complete
    await new Promise(resolve => setTimeout(resolve, 400));

    try {
        const response = await fetch(url);
        if (!response.ok) {
            window.location.href = url;
            return;
        }
        const text = await response.text();
        const parser = new DOMParser();
        const newDocument = parser.parseFromString(text, 'text/html');

        const newContent = newDocument.getElementById('page-content');
        const newTitle = newDocument.querySelector('title');
        const pageContentContainer = document.getElementById('page-content');

        if (pageContentContainer && newContent && newTitle) {
            document.title = newTitle.innerText;
            pageContentContainer.innerHTML = newContent.innerHTML;

            const urlObject = new URL(url, window.location.href);
            if (urlObject.hash) {
                // Wait for the DOM to update before trying to scroll
                setTimeout(() => {
                    const targetElement = document.getElementById(urlObject.hash.substring(1));
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        window.scrollTo(0, 0);
                    }
                }, 100);
            } else {
                window.scrollTo(0, 0);
            }

            initPageSpecificScripts(); // Re-initialize scripts for the new content
        } else {
            window.location.href = url;
            return;
        }

    } catch (error) {
        console.error('Page transition failed:', error);
        window.location.href = url; // Fallback on any error
        return;
    }

    // Fade out the overlay to reveal the new content
    overlay.classList.add('opacity-0', 'pointer-events-none');
}

// --- Main execution logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup for the first page load
    initPageSpecificScripts();

    // --- Floating Nav Menu Logic ---
    // This script should only be initialized once.
    if (!window.floatingNavInitialized) {
        const navBg = document.getElementById('nav-bg');
        const toggleBtn = document.getElementById('toggle-btn');
        const mainNav = document.getElementById('main-nav');

        if (navBg && toggleBtn && mainNav) {
            let open = false;

            const calculateValues = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                const btnRect = toggleBtn.getBoundingClientRect();
                const bgRect = navBg.getBoundingClientRect();

                const btnCenterX = btnRect.left + btnRect.width / 2;
                const btnCenterY = btnRect.top + btnRect.height / 2;

                const translateX = (w / 2) - btnCenterX;
                const translateY = (h / 2) - btnCenterY;

                // Radius to cover the distance to the farthest corner (bottom-left from top-right button)
                const radius = Math.sqrt(btnCenterX ** 2 + (h - btnCenterY) ** 2);

                const scale = (radius * 2) / bgRect.width;

                return { scale, translateX, translateY };
            };

            const openMenu = () => {
                const { scale, translateX, translateY } = calculateValues();
                navBg.style.setProperty("--translate-x", `${translateX}px`);
                navBg.style.setProperty("--translate-y", `${translateY}px`);
                navBg.style.setProperty("--scale", scale);
            };

            const closeMenu = () => {
                navBg.style.setProperty("--scale", '1');
                navBg.style.setProperty("--translate-x", '0px');
                navBg.style.setProperty("--translate-y", '0px');
            };

            const toggleMenu = () => {
                open = !open;
                toggleBtn.classList.toggle('shown');
                if (open) {
                    openMenu();
                } else {
                    closeMenu();
                }
            };

            toggleBtn.addEventListener('click', toggleMenu, false);

            // Close menu when a link is clicked
            mainNav.querySelectorAll('a').forEach(link => {
                // The main SPA logic already handles the click, we just need to close the menu
                link.addEventListener('click', () => {
                    if (open) {
                        toggleMenu();
                    }
                });
            });

            const resizeHandler = () => {
                window.requestAnimationFrame(() => {
                    if (open) {
                        openMenu();
                    }
                });
            }

            window.addEventListener("resize", resizeHandler, false);
        }
        window.floatingNavInitialized = true;
    }


    // Handle browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        // The initial popstate event has a null state. We don't want to transition on page load.
        if (event.state) {
            performTransition(window.location.href);
        }
    });

    // Intercept clicks on internal links to trigger transitions
    document.body.addEventListener('click', (event) => {
        // Allow default behavior for language switcher
        if (event.target.closest('.language-switcher')) {
            return;
        }

        const link = event.target.closest('a');

        // Check if it is a valid link for our SPA-style navigation
        if (!link || !link.href || link.target === '_blank' || !link.protocol.startsWith('http') || link.hostname !== window.location.hostname) {
            return;
        }

        // Ignore same-page anchor links to allow default smooth scrolling
        if (link.pathname === window.location.pathname && link.hash) {
            return;
        }

        event.preventDefault();

        // Avoid re-triggering transition for the exact same URL
        if (link.href === window.location.href) {
            return;
        }

        history.pushState({ path: link.href }, '', link.href);
        performTransition(link.href);
    });
});