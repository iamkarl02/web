// Funcionalidad del menú móvil
const mcMobileMenuBtn = document.querySelector('.mc-mobile-menu-btn');
const mcMobileMenu = document.querySelector('.mc-mobile-menu');
const mcNavMenu = document.querySelector('.mc-nav-menu');
const mcNavRight = document.querySelector('.mc-nav-right');

function mcToggleMenu() {
    const isActive = mcMobileMenu.classList.toggle('active');
    
    // Ocultar/mostrar elementos del escritorio cuando el móvil está activo
    if (isActive) {
        mcNavMenu.classList.add('active');
        mcNavRight.classList.add('active');
    } else {
        mcNavMenu.classList.remove('active');
        mcNavRight.classList.remove('active');
    }
}

mcMobileMenuBtn.addEventListener('click', mcToggleMenu);

// Cerrar menú al hacer clic en un enlace
const mcMobileLinks = document.querySelectorAll('.mc-mobile-nav-menu a');
mcMobileLinks.forEach(link => {
    link.addEventListener('click', function() {
        mcToggleMenu();
    });
});

// Funcionalidad del selector de idioma
const mcLanguageIcons = document.querySelectorAll('.mc-language-icon');
const mcLanguageOptions = document.querySelectorAll('.mc-language-options');
const mcMobileLanguageBottom = document.querySelector('.mc-mobile-language-bottom');

mcLanguageIcons.forEach((icon, index) => {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        mcLanguageOptions[index].classList.toggle('active');
    });
});

if (mcMobileLanguageBottom) {
    mcMobileLanguageBottom.addEventListener('click', function(e) {
        e.stopPropagation();
        const options = this.querySelector('.mc-mobile-language-options');
        options.classList.toggle('active');
    });
}

// Cerrar menús de idioma al hacer clic en cualquier parte
document.addEventListener('click', function() {
    mcLanguageOptions.forEach(option => {
        option.classList.remove('active');
    });
});

// Cerrar menú móvil al cambiar tamaño de ventana
window.addEventListener('resize', function() {
    if (window.innerWidth > 992) {
        mcMobileMenu.classList.remove('active');
        mcNavMenu.classList.remove('active');
        mcNavRight.classList.remove('active');
    }
});

// Versión ultra fluida
const mcNavbarSpacer = document.querySelector('.mc-navbar-spacer');

function handleScroll() {
    const scrollY = window.scrollY;
    
    // Transición progresiva basada en el scroll
    if (scrollY > 80) {
        mcNavbarSpacer.classList.add('scrolled', 'fully-scrolled');
    } else if (scrollY > 20) {
        mcNavbarSpacer.classList.add('scrolled');
        mcNavbarSpacer.classList.remove('fully-scrolled');
    } else {
        mcNavbarSpacer.classList.remove('scrolled', 'fully-scrolled');
    }
}

// Usar requestAnimationFrame para máxima fluidez
let ticking = false;
window.addEventListener('scroll', function() {
    if (!ticking) {
        requestAnimationFrame(function() {
            handleScroll();
            ticking = false;
        });
        ticking = true;
    }
});

handleScroll();