// ============================================================
//  PÁGINA TOOLBOX – Genera botones de mini herramientas
// ============================================================
(function() {
    'use strict';

    // Lista de mini herramientas (nombre e icono opcional)
    const tools = [
        { name: 'Reloj', icon: '⏰', link: 'reloj.html' },
        { name: 'Fondos de Pantalla', icon: '🖼️', link: 'fondos.html' },
        { name: 'Selector de Colores', icon: '🎨', link: 'selector.html' },
        { name: 'Generador de variantes', icon: '🎨', link: 'variantes.html' }
    ];

    const toolsGrid = document.getElementById('toolsGrid');

    // Crear botones dinámicamente
    function createToolButtons() {
        toolsGrid.innerHTML = '';
        tools.forEach(tool => {
            const anchor = document.createElement('a');
            anchor.href = tool.link;
            anchor.classList.add('tool-button');
            
            // Icono
            const iconSpan = document.createElement('span');
            iconSpan.classList.add('tool-icon');
            iconSpan.textContent = tool.icon;
            
            // Nombre
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('tool-name');
            nameSpan.textContent = tool.name;
            
            anchor.appendChild(iconSpan);
            anchor.appendChild(nameSpan);
            toolsGrid.appendChild(anchor);
        });
    }

    // Inicializar al cargar
    document.addEventListener('DOMContentLoaded', function() {
        createToolButtons();

        // Logo → volver al inicio
        const logo = document.getElementById('logoStar');
        if (logo) {
            logo.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }

        console.log('🧰 ToolBox listo');
    });
})();
