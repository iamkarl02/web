// ============================================================
//  CARRUSEL DE FONDOS DE PANTALLA (imágenes y vídeos)
//  Soporte para vídeos divididos en partes: nombre_part1.mp4, etc.
// ============================================================
(function() {
    'use strict';

    // ============================================================
    //  LISTA DE ARCHIVOS (EDITA AQUÍ)
    //  Los vídeos divididos deben seguir el patrón:
    //  nombre_base_part1.mp4, nombre_base_part2.mp4, etc.
    // ============================================================
    const rawItems = [
        { tipo: 'imagen', src: '../assets/fondos/img_vid/1.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/2.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/4.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/5.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/6.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/7.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/8.png' },
        { tipo: 'video', src: '../assets/fondos/img_vid/9.mp4' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/10.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/11.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/12.png' },
        { tipo: 'video', src: '../assets/fondos/img_vid/13.mp4' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/15.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/16.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/17.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/18.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/19.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/20.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/21.png' },
        { tipo: 'imagen', src: '../assets/fondos/img_vid/22.png' }
    ];

    // ============================================================
    //  PROCESAR LISTA PARA AGRUPAR PARTES DE VÍDEO
    // ============================================================
    function agruparVideosDivididos(items) {
        const resultado = [];
        const grupos = {};

        items.forEach(item => {
            if (item.tipo === 'video') {
                // Detectar patrón: nombre_base_partN.extension
                const match = item.src.match(/^(.*)_part(\d+)(\.[^.]+)$/);
                if (match) {
                    const base = match[1]; // nombre base sin _partN
                    const parte = parseInt(match[2], 10);
                    const extension = match[3];
                    if (!grupos[base]) {
                        grupos[base] = {
                            tipo: 'video',
                            partes: [],
                            extension: extension,
                            src: null // se rellenará después
                        };
                    }
                    grupos[base].partes.push({
                        parte: parte,
                        src: item.src
                    });
                } else {
                    // Vídeo normal sin partes
                    resultado.push(item);
                }
            } else {
                // Imagen u otro tipo: se agrega directamente
                resultado.push(item);
            }
        });

        // Ahora recorremos los grupos y los añadimos al resultado
        Object.keys(grupos).forEach(base => {
            const grupo = grupos[base];
            // Ordenar por número de parte
            grupo.partes.sort((a, b) => a.parte - b.parte);
            // Crear elemento agrupado
            resultado.push({
                tipo: 'video',
                src: grupo.partes.map(p => p.src), // array de rutas
                partes: grupo.partes,
                esDividido: true
            });
        });

        return resultado;
    }

    const mediaItems = agruparVideosDivididos(rawItems);

    let currentIndex = 0;
    let isTransitioning = false;
    let currentMediaElement = null;
    let currentVideoIndex = 0; // Para reproducir partes secuencialmente

    const mediaContainer = document.getElementById('mediaContainer');
    const btnDescargar = document.getElementById('btnDescargar');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('dotsContainer');

    function limpiarMedia() {
        if (currentMediaElement) {
            if (currentMediaElement.tagName === 'VIDEO') {
                currentMediaElement.pause();
                currentMediaElement.src = '';
                currentMediaElement.load();
                // Eliminar evento ended
                currentMediaElement.onended = null;
            }
            currentMediaElement.remove();
            currentMediaElement = null;
        }
        currentVideoIndex = 0;
    }

    // Función para reproducir la siguiente parte del vídeo dividido
    function reproducirSiguienteParte(video, partes) {
        if (currentVideoIndex < partes.length - 1) {
            currentVideoIndex++;
            video.src = partes[currentVideoIndex].src;
            video.play().catch(err => console.warn('Error al reproducir parte:', err));
        } else {
            // Si es bucle, reiniciar al final (opcional)
            if (video.loop) {
                currentVideoIndex = 0;
                video.src = partes[0].src;
                video.play().catch(err => console.warn('Error al reiniciar:', err));
            }
        }
    }

    function mostrarMedia(item) {
        limpiarMedia();

        if (item.tipo === 'imagen') {
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = 'Fondo de pantalla';
            mediaContainer.appendChild(img);
            currentMediaElement = img;
            btnDescargar.href = item.src;
            btnDescargar.setAttribute('download', item.src.split('/').pop());
        } else if (item.tipo === 'video') {
            const video = document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.volume = 0;
            video.loop = true; // bucle del grupo completo
            video.playsInline = true;
            mediaContainer.appendChild(video);
            currentMediaElement = video;

            if (item.esDividido && item.partes && item.partes.length > 0) {
                // Reproducir primera parte
                currentVideoIndex = 0;
                video.src = item.partes[0].src;
                // Cuando termine una parte, reproducir la siguiente
                video.onended = () => {
                    reproducirSiguienteParte(video, item.partes);
                };
                // Para descarga, generaremos un blob combinado
                btnDescargar.href = '#'; // se actualizará al hacer clic
                btnDescargar.setAttribute('download', 'video_completo.mp4');
            } else {
                // Vídeo normal
                video.src = Array.isArray(item.src) ? item.src[0] : item.src;
                btnDescargar.href = video.src;
                btnDescargar.setAttribute('download', video.src.split('/').pop());
            }

            video.play().catch(err => {
                console.warn('Autoplay bloqueado:', err);
            });
        }
    }

    // Descargar vídeo dividido combinando partes
    async function descargarVideoDividido(partes, nombreBase) {
        try {
            const blobs = [];
            for (const parte of partes) {
                const response = await fetch(parte.src);
                if (!response.ok) throw new Error('Error al descargar parte');
                const blob = await response.blob();
                blobs.push(blob);
            }
            const blobCombinado = new Blob(blobs, { type: 'video/mp4' });
            const url = URL.createObjectURL(blobCombinado);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreBase + '.mp4';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al combinar vídeo:', error);
            alert('No se pudo descargar el vídeo completo.');
        }
    }

    // Evento de descarga personalizado
    btnDescargar.addEventListener('click', (e) => {
        const item = mediaItems[currentIndex];
        if (item.tipo === 'video' && item.esDividido) {
            e.preventDefault();
            const nombreBase = item.partes[0].src.replace(/^.*\/(.*)_part\d+\.[^.]+$/, '$1');
            descargarVideoDividido(item.partes, nombreBase);
        }
    });

    function updateMedia() {
        const item = mediaItems[currentIndex];
        mostrarMedia(item);

        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function goToMedia(index) {
        if (isTransitioning) return;
        if (index < 0) {
            currentIndex = mediaItems.length - 1;
        } else if (index >= mediaItems.length) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }
        isTransitioning = true;
        updateMedia();
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }

    function nextMedia() { goToMedia(currentIndex + 1); }
    function prevMedia() { goToMedia(currentIndex - 1); }

    function toggleFullscreen() {
        const elem = document.querySelector('.fondos-page');
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                console.error('Error al activar pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    function createDots() {
        dotsContainer.innerHTML = '';
        mediaItems.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === currentIndex) dot.classList.add('active');
            dot.addEventListener('click', () => goToMedia(index));
            dotsContainer.appendChild(dot);
        });
    }

    prevBtn.addEventListener('click', prevMedia);
    nextBtn.addEventListener('click', nextMedia);
    btnFullscreen.addEventListener('click', toggleFullscreen);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevMedia();
        if (e.key === 'ArrowRight') nextMedia();
    });

    const logo = document.getElementById('logoStar');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '../../index.html';
        });
    }

    createDots();
    updateMedia();
})();