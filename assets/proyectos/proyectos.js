// ============================================================
//  CARRUSEL DE PROYECTOS
// ============================================================
(function() {
    'use strict';

    // Lista de proyectos (puedes modificar nombres, imágenes y enlaces)
    const projects = [
        {
            name: 'ToolBox',
            image: 'assets/proyectos/img/toolbox.jpg',
            link: 'toolbox/toolbox.html'
        }
    ];

    let currentIndex = 0;
    let isTransitioning = false; // para evitar cambios rápidos

    // Elementos del DOM
    const background = document.getElementById('projectBackground');
    const projectName = document.getElementById('projectName');
    const btnIr = document.getElementById('btnIr');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('dotsContainer');

    // Crear dots dinámicamente
    function createDots() {
        dotsContainer.innerHTML = '';
        projects.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === currentIndex) dot.classList.add('active');
            dot.addEventListener('click', () => goToProject(index));
            dotsContainer.appendChild(dot);
        });
    }

    // Actualizar la vista con el proyecto actual
    function updateProject() {
        const project = projects[currentIndex];
        // Cambiar imagen de fondo
        background.style.backgroundImage = `url('${project.image}')`;
        // Cambiar nombre
        projectName.textContent = project.name;
        // Actualizar enlace del botón "Ir"
        btnIr.href = project.link;
        // Actualizar dots
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        // Reiniciar animación del nombre
        projectName.style.animation = 'none';
        void projectName.offsetWidth; // reflow
        projectName.style.animation = 'fadeUp 0.7s ease';
    }

    // Ir a un proyecto específico (con límites)
    function goToProject(index) {
        if (isTransitioning) return;
        if (index < 0) {
            currentIndex = projects.length - 1;
        } else if (index >= projects.length) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }
        isTransitioning = true;
        updateProject();
        setTimeout(() => {
            isTransitioning = false;
        }, 600); // coincide con la transición de fondo
    }

    // Siguiente proyecto
    function nextProject() {
        goToProject(currentIndex + 1);
    }

    // Proyecto anterior
    function prevProject() {
        goToProject(currentIndex - 1);
    }

    // Event listeners
    prevBtn.addEventListener('click', prevProject);
    nextBtn.addEventListener('click', nextProject);

    // Soporte de teclado (opcional)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevProject();
        if (e.key === 'ArrowRight') nextProject();
    });

    // Inicializar
    createDots();
    updateProject();

    // Logo click → volver al inicio
    const logo = document.getElementById('logoStar');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
})();