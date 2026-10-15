/**
 * NotesHub - Frontend Interactivity & Live Client-side Handling
 * Mobile Menu, Hash Tab Navigation, Smooth Scrolling, Search & Toast Alerts
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. MOBILE HAMBURGER MENU & DRAWER
    // ==========================================
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    const drawerClose = document.getElementById('mobile-drawer-close');

    const openMobileMenu = () => {
        if (!drawer || !backdrop) return;
        drawer.classList.add('active');
        backdrop.classList.add('active');
        document.body.classList.add('menu-open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
    };

    const closeMobileMenu = () => {
        if (!drawer || !backdrop) return;
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.classList.remove('menu-open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (drawer && drawer.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    if (drawerClose) drawerClose.addEventListener('click', closeMobileMenu);
    if (backdrop) backdrop.addEventListener('click', closeMobileMenu);

    // Close mobile drawer when clicking any link inside it
    if (drawer) {
        const drawerLinks = drawer.querySelectorAll('a');
        drawerLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer && drawer.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // ==========================================
    // 2. AUTO-DISMISS FLASH ALERTS
    // ==========================================
    const toasts = document.querySelectorAll('.toast-alert');
    toasts.forEach((toast) => {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    });

    // ==========================================
    // 3. TAB NAVIGATION WITH URL HASH SUPPORT
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-pane');

    // Hash alias mapping to normalize legacy or shorthand hashes
    const hashAliases = {
        '#notes-tab': 'tab-manage-notes',
        '#doubts-section': 'tab-doubts',
        '#students-tab': 'tab-students',
        '#teachers-tab': 'tab-teachers',
        '#subjects-tab': 'tab-subjects',
        '#timetable-tab': 'tab-timetable',
        '#results-tab': 'tab-results'
    };

    const activateTabById = (targetId) => {
        if (!targetId) return false;
        const normalizedId = targetId.startsWith('#') ? targetId.substring(1) : targetId;
        const targetPane = document.getElementById(normalizedId);
        const matchingBtn = document.querySelector(`.tab-btn[data-tab="${normalizedId}"]`);

        if (targetPane && matchingBtn) {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            matchingBtn.classList.add('active');
            targetPane.classList.add('active');
            return true;
        }
        return false;
    };

    // Activate on button click
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            if (targetId) {
                activateTabById(targetId);
                // Preserve active tab in URL hash without triggering scroll
                if (history.replaceState) {
                    history.replaceState(null, null, '#' + targetId);
                }
            }
        });
    });

    // Handle hash on initial page load
    if (tabButtons.length > 0 && window.location.hash) {
        let currentHash = window.location.hash;
        if (hashAliases[currentHash]) {
            currentHash = '#' + hashAliases[currentHash];
        }
        activateTabById(currentHash);
    }

    // Handle hashchange event (back/forward browser buttons or direct anchor clicks)
    window.addEventListener('hashchange', () => {
        if (tabButtons.length > 0 && window.location.hash) {
            let currentHash = window.location.hash;
            if (hashAliases[currentHash]) {
                currentHash = '#' + hashAliases[currentHash];
            }
            activateTabById(currentHash);
        }
    });

    // ==========================================
    // 4. REAL-TIME NOTE SEARCH FILTER
    // ==========================================
    const noteSearchInput = document.getElementById('note-search');
    const noteCards = document.querySelectorAll('.note-item-card');
    const noNotesMessage = document.getElementById('no-search-results');

    if (noteSearchInput && noteCards.length > 0) {
        noteSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            noteCards.forEach(card => {
                const title = card.getAttribute('data-title') || '';
                const subject = card.getAttribute('data-subject') || '';
                const desc = card.getAttribute('data-desc') || '';
                const section = card.getAttribute('data-section') || '';

                const matches = title.toLowerCase().includes(query) ||
                                subject.toLowerCase().includes(query) ||
                                desc.toLowerCase().includes(query) ||
                                section.toLowerCase().includes(query);

                if (matches) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (noNotesMessage) {
                noNotesMessage.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        });
    }

    // ==========================================
    // 5. SUBJECT FILTER PILLS
    // ==========================================
    const subjectFilterPills = document.querySelectorAll('.subject-filter-pill');
    if (subjectFilterPills.length > 0) {
        subjectFilterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                subjectFilterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const selectedSubject = pill.getAttribute('data-subject-id');
                let visibleCount = 0;

                noteCards.forEach(card => {
                    const cardSubject = card.getAttribute('data-subject-id');
                    if (selectedSubject === 'all' || cardSubject === selectedSubject) {
                        card.style.display = 'flex';
                        visibleCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });

                if (noNotesMessage) {
                    noNotesMessage.style.display = visibleCount === 0 ? 'block' : 'none';
                }
            });
        });
    }

    // ==========================================
    // 6. FILE INPUT PREVIEW FILENAME
    // ==========================================
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const label = input.closest('.file-upload-wrapper')?.querySelector('.file-upload-label');
            if (file && label) {
                const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                label.innerHTML = `📁 <strong>${file.name}</strong> <small>(${sizeMb} MB)</small>`;
            }
        });
    });

    // ==========================================
    // 7. DELETE CONFIRMATION HANDLER
    // ==========================================
    const deleteForms = document.querySelectorAll('.delete-confirm-form');
    deleteForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const noteTitle = form.getAttribute('data-title') || 'this item';
            if (!confirm(`Are you sure you want to permanently delete "${noteTitle}"? This cannot be undone.`)) {
                e.preventDefault();
            }
        });
    });

    // ==========================================
    // 8. FRAMER-MOTION STYLE SPRING PHYSICS & 3D TILT
    // ==========================================
    const tiltCards = document.querySelectorAll('.hero-feature-card, .feature-detail-box, .contact-card, .stat-card, .glass-showcase-panel');
    
    // Check if device supports hover and prefers motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;

    if (!prefersReducedMotion && canHover && tiltCards.length > 0) {
        tiltCards.forEach(card => {
            card.style.transformStyle = 'preserve-3d';
            card.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease';

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Max tilt 6 degrees for subtle, elegant spring feel
                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            });
        });
    }

    // ==========================================
    // 9. INTERSECTION OBSERVER SCROLL REVEALS
    // ==========================================
    const revealElements = document.querySelectorAll('.hero-feature-card, .feature-detail-box, .contact-card, .about-content, .glass-showcase-panel, .stat-card, .note-item-card');

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Staggered reveal delay
                    setTimeout(() => {
                        entry.target.classList.add('motion-revealed');
                    }, index * 60);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => {
            el.classList.add('motion-item');
            revealObserver.observe(el);
        });
    } else {
        revealElements.forEach(el => el.classList.add('motion-revealed'));
    }
});
