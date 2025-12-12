// fondo.js
function initCardBackground() {
    // Crear el CSS con z-index bajo desde el inicio
    const css = `
        body { 
            background: #ffe6f2 !important; 
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        html {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
        }
        .card-container { 
            position: fixed !important; 
            width: 100vw !important; 
            height: 100vh !important; 
            transform-style: preserve-3d; 
            z-index: -9999 !important; 
            top: 0 !important; 
            left: 0 !important; 
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        .card { 
            position: absolute; 
            width: 180px; 
            height: 270px; 
            background: #ffffff; 
            border-radius: 12px; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            padding: 15px; 
            transform-style: preserve-3d; 
            opacity: 0.95; 
            border: 2px solid rgba(255,182,193,0.5); 
        }
        .card::before, .card::after { 
            content: attr(data-value); 
            font-size: 24px; 
            font-weight: bold; 
        }
        .card::before { 
            align-self: flex-start; 
        }
        .card::after { 
            align-self: flex-end; 
            transform: rotate(180deg); 
        }
        .card-symbol { 
            font-size: 50px; 
            align-self: center; 
            margin: 15px 0; 
        }
        .card-heart, .card-diamond { 
            color: #dc143c; 
        }
        .card-club, .card-spade { 
            color: #000000; 
        }
        .card-heart::before, .card-heart::after, .card-diamond::before, .card-diamond::after { 
            color: #dc143c; 
        }
        .card-club::before, .card-club::after, .card-spade::before, .card-spade::after { 
            color: #000000; 
        }
    `;
    
    // Añadir CSS al head PRIMERO
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    let existingCards = new Map();
    
    function initializeCards() {
        // Crear el contenedor HTML
        let cardContainer = document.getElementById('cardContainer');
        if (!cardContainer) {
            cardContainer = document.createElement('div');
            cardContainer.className = 'card-container';
            cardContainer.id = 'cardContainer';
            document.body.insertBefore(cardContainer, document.body.firstChild);
        }
        
        const suits = ['heart', 'diamond', 'club', 'spade'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const symbols = { heart: '♥', diamond: '♦', club: '♣', spade: '♠' };

        function getCardKey(col, row) {
            return `${col},${row}`;
        }

        function createCard(col, row) {
            const cardKey = getCardKey(col, row);
            
            // Si la carta ya existe, reutilizarla
            if (existingCards.has(cardKey)) {
                const existingCard = existingCards.get(cardKey);
                positionCard(existingCard, col, row);
                return existingCard;
            }
            
            // Crear nueva carta
            const suit = suits[Math.floor(Math.random() * suits.length)];
            const value = values[Math.floor(Math.random() * values.length)];
            const card = document.createElement('div');
            card.className = `card card-${suit}`;
            card.setAttribute('data-value', value);
            card.setAttribute('data-suit', suit);
            card.innerHTML = `<div class="card-symbol">${symbols[suit]}</div>`;
            
            positionCard(card, col, row);
            existingCards.set(cardKey, card);
            
            return card;
        }

        function positionCard(card, col, row) {
            const x = col * 300 + (row % 2 ? 100 : 0);
            const y = row * 350;
            card.style.left = `${x - 90}px`;
            card.style.top = `${y - 135}px`;
            card.style.transform = `rotate(${(row + col) % 2 ? 12 : -12}deg)`;
        }

        function generateCards() {
            const cardContainer = document.getElementById('cardContainer');
            if (!cardContainer) return;
            
            // Calcular área MUY amplia para cubrir cualquier redimensionamiento
            const cardWidth = 180;
            const cardHeight = 270;
            const spacingX = 300;
            const spacingY = 350;
            
            // Generar MUCHAS más cartas de las necesarias para anticiparse a redimensionamientos
            const margin = 8; // Margen de anticipación MUY grande
            const startCol = Math.floor(-cardWidth / spacingX) - margin;
            const endCol = Math.ceil((window.innerWidth + cardWidth) / spacingX) + margin;
            const startRow = Math.floor(-cardHeight / spacingY) - margin;
            const endRow = Math.ceil((window.innerHeight + cardHeight) / spacingY) + margin;
            
            const newCards = new Map();
            
            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    const cardKey = getCardKey(col, row);
                    let card;
                    
                    if (existingCards.has(cardKey)) {
                        card = existingCards.get(cardKey);
                        positionCard(card, col, row);
                    } else {
                        card = createCard(col, row);
                        cardContainer.appendChild(card);
                    }
                    
                    newCards.set(cardKey, card);
                }
            }
            
            // Eliminar cartas que ya no son necesarias
            existingCards.forEach((card, key) => {
                if (!newCards.has(key)) {
                    card.remove();
                }
            });
            
            existingCards = newCards;
        }

        // Generar cartas iniciales
        generateCards();
        
        // Regenerar cartas al redimensionar para cubrir nuevas áreas
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(generateCards, 100);
        });
        
        window.addEventListener('orientationchange', function() {
            setTimeout(generateCards, 150);
        });
    }

    // Asegurar que el viewport esté configurado correctamente para móviles
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(meta);
    } else {
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCards);
    } else {
        setTimeout(initializeCards, 100);
    }
}

// Auto-ejecutar cuando se carga el script
initCardBackground();
