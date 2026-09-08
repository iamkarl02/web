// ============================================================
//  RELOJ TOOLBOX – Solicita ubicación automáticamente al cargar
//  Muestra hora, fecha completa y zona horaria.
// ============================================================
(function() {
    'use strict';

    const tiempoEl = document.getElementById('tiempo');
    const fechaEl = document.getElementById('fechaInfo');
    const zonaEl = document.getElementById('zonaInfo');
    const btnPantallaCompleta = document.getElementById('btnPantallaCompleta');
    const logo = document.getElementById('logoStar');

    let currentTimeZone = null;   // ej. "Europe/Madrid"
    let timer = null;

    function pad(num) {
        return String(num).padStart(2, '0');
    }

    // Obtener partes de hora usando Intl (evita NaN)
    function getTimeParts() {
        const now = new Date();
        let hours, minutes, seconds;

        if (currentTimeZone) {
            const formatter = new Intl.DateTimeFormat('es-ES', {
                timeZone: currentTimeZone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            const parts = formatter.formatToParts(now);
            hours = parts.find(p => p.type === 'hour').value;
            minutes = parts.find(p => p.type === 'minute').value;
            seconds = parts.find(p => p.type === 'second').value;
            if (hours === '24') hours = '00';
        } else {
            hours = pad(now.getHours());
            minutes = pad(now.getMinutes());
            seconds = pad(now.getSeconds());
        }

        return { hours, minutes, seconds };
    }

    // Obtener fecha completa (día de la semana, día, mes, año)
    function getFormattedDate() {
        const now = new Date();
        const options = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        if (currentTimeZone) {
            options.timeZone = currentTimeZone;
        }
        return new Intl.DateTimeFormat('es-ES', options).format(now);
    }

    function updateClock() {
        const { hours, minutes, seconds } = getTimeParts();
        tiempoEl.textContent = `${hours}:${minutes}:${seconds}`;
        fechaEl.textContent = getFormattedDate();
        zonaEl.textContent = currentTimeZone || 'Hora local';
    }

    function startClock() {
        if (timer) clearInterval(timer);
        timer = setInterval(updateClock, 1000);
        updateClock(); // inmediato
    }

    async function obtenerZonaHoraria(lat, lon) {
        const response = await fetch(`https://timeapi.io/api/Time/current/coordinate?latitude=${lat}&longitude=${lon}`);
        if (!response.ok) throw new Error('Error en la API de zona horaria');
        const data = await response.json();
        if (data && data.timeZone) {
            return data.timeZone;
        } else {
            throw new Error('No se pudo obtener la zona horaria');
        }
    }

    function usarUbicacion() {
        zonaEl.textContent = 'Obteniendo ubicación…';
        if (!navigator.geolocation) {
            zonaEl.textContent = 'Geolocalización no soportada';
            currentTimeZone = null;
            updateClock();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const timeZone = await obtenerZonaHoraria(latitude, longitude);
                    currentTimeZone = timeZone;
                    updateClock();
                } catch (error) {
                    console.error('Error al obtener zona horaria:', error);
                    zonaEl.textContent = 'Usando hora local (fallo API)';
                    currentTimeZone = null;
                    updateClock();
                }
            },
            (error) => {
                console.error('Error de geolocalización:', error);
                zonaEl.textContent = 'Usando hora local (permiso denegado)';
                currentTimeZone = null;
                updateClock();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function togglePantallaCompleta() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error al activar pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    btnPantallaCompleta.addEventListener('click', togglePantallaCompleta);

    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '../../index.html';
        });
    }

    // Iniciar reloj y pedir ubicación automáticamente
    startClock();
    usarUbicacion();
})();