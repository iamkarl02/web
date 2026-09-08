// ============================================================
//  SELECTOR DE COLORES – Cambia fondo y descarga imagen
// ============================================================
(function() {
    'use strict';

    // Elementos
    const btnElegir = document.getElementById('btnElegirColor');
    const btnDescargar = document.getElementById('btnDescargar');
    const modalColor = document.getElementById('modalColor');
    const modalDescarga = document.getElementById('modalDescarga');
    const cerrarColor = document.getElementById('cerrarColor');
    const cerrarDescarga = document.getElementById('cerrarDescarga');
    const inputColor = document.getElementById('inputColor');
    const colorPreview = document.getElementById('colorPreview');
    const colorHex = document.getElementById('colorHex');
    const opcionesDim = document.querySelectorAll('.opcion-dim');
    const camposPersonalizado = document.getElementById('personalizadoCampos');
    const inputAncho = document.getElementById('ancho');
    const inputAlto = document.getElementById('alto');
    const btnCancelarDescarga = document.getElementById('btnCancelarDescarga');
    const btnConfirmarDescarga = document.getElementById('btnConfirmarDescarga');
    const logo = document.getElementById('logoStar');

    let colorActual = '#ffffff';

    // Abrir modal de color
    btnElegir.addEventListener('click', () => {
        modalColor.classList.add('active');
        inputColor.value = colorActual;
        actualizarPreview(colorActual);
    });

    // Cerrar modal de color
    cerrarColor.addEventListener('click', () => {
        modalColor.classList.remove('active');
    });

    // Cambiar color
    inputColor.addEventListener('input', (e) => {
        colorActual = e.target.value;
        document.body.style.backgroundColor = colorActual;
        actualizarPreview(colorActual);
    });

    function actualizarPreview(color) {
        colorPreview.style.backgroundColor = color;
        colorHex.textContent = color;
    }

    // Abrir modal de descarga
    btnDescargar.addEventListener('click', () => {
        modalDescarga.classList.add('active');
        // Mostrar horizontal como activa por defecto
        opcionesDim.forEach(op => {
            if (op.dataset.dim === 'horizontal') {
                op.classList.add('activa');
            } else {
                op.classList.remove('activa');
            }
        });
        camposPersonalizado.classList.remove('visible');
    });

    // Cerrar modal de descarga
    cerrarDescarga.addEventListener('click', () => {
        modalDescarga.classList.remove('active');
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalColor) modalColor.classList.remove('active');
        if (e.target === modalDescarga) modalDescarga.classList.remove('active');
    });

    // Selección de opciones de dimensión
    opcionesDim.forEach(opcion => {
        opcion.addEventListener('click', () => {
            opcionesDim.forEach(op => op.classList.remove('activa'));
            opcion.classList.add('activa');
            if (opcion.dataset.dim === 'personalizado') {
                camposPersonalizado.classList.add('visible');
            } else {
                camposPersonalizado.classList.remove('visible');
            }
        });
    });

    // Obtener dimensiones según selección
    function obtenerDimensiones() {
        const activa = document.querySelector('.opcion-dim.activa');
        const dim = activa ? activa.dataset.dim : 'horizontal';
        switch (dim) {
            case 'vertical': return { ancho: 1080, alto: 1920 };
            case 'horizontal': return { ancho: 1920, alto: 1080 };
            case 'cuadrado': return { ancho: 1080, alto: 1080 };
            case 'personalizado':
                const ancho = parseInt(inputAncho.value) || 1920;
                const alto = parseInt(inputAlto.value) || 1080;
                return { ancho, alto };
            default: return { ancho: 1920, alto: 1080 };
        }
    }

    // Descargar imagen
    function descargarImagen(ancho, alto) {
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = colorActual;
        ctx.fillRect(0, 0, ancho, alto);
        const enlace = document.createElement('a');
        enlace.download = `color_${colorActual.replace('#', '')}_${ancho}x${alto}.png`;
        enlace.href = canvas.toDataURL('image/png');
        enlace.click();
    }

    // Confirmar descarga
    btnConfirmarDescarga.addEventListener('click', () => {
        const { ancho, alto } = obtenerDimensiones();
        descargarImagen(ancho, alto);
        modalDescarga.classList.remove('active');
    });

    // Cancelar descarga
    btnCancelarDescarga.addEventListener('click', () => {
        modalDescarga.classList.remove('active');
    });

    // Logo clicable
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '../../index.html';
        });
    }

    // Color inicial
    document.body.style.backgroundColor = colorActual;
    actualizarPreview(colorActual);
})();