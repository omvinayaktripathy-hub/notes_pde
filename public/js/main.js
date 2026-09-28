/**
 * NotesHub - Frontend Interactivity & Live Client-side Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auto-dismiss toast alerts after 4.5 seconds
    const toast = document.getElementById('toast-alert');
    if (toast) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }

    // 2. Real-time note filtering by search input
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

    // 3. Subject filter pills click handler
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

    // 4. File input preview filename
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

    // 5. Delete confirmation
    const deleteForms = document.querySelectorAll('.delete-confirm-form');
    deleteForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const noteTitle = form.getAttribute('data-title') || 'this note';
            if (!confirm(`Are you sure you want to permanently delete "${noteTitle}"?`)) {
                e.preventDefault();
            }
        });
    });

    // 6. Tab Navigation (for Teacher Dashboard & Student Dashboard)
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
});
