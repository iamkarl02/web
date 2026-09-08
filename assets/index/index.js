// ============================================================
//  COMPORTAMIENTO PÁGINA HOME (index)
// ============================================================
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✨ Inicio · Carlos');

        const logo = document.getElementById('logoStar');
        if (logo) {
            logo.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }

        const title = document.querySelector('.hero h1');
        if (title) {
            title.style.opacity = '0';
            title.style.transform = 'translateY(12px)';
            setTimeout(() => {
                title.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
            }, 120);
        }
    });
})();