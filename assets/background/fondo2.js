// fondo.js
function initCardBackground() {
    // Crear el CSS con z-index bajo desde el inicio
    const css = `
        body { background: #ffe6f2 !important; }
        .card-container { 
            position: fixed !important; 
            width: 100% !important; 
            height: 100% !important; 
            transform-style: preserve-3d; 
            z-index: -9999 !important; 
            top: 0 !important; 
            left: 0 !important; 
        }
        .card { position: absolute; width: 180px; height: 270px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; justify-content: space-between; padding: 15px; transform-style: preserve-3d; opacity: 0.95; border: 2px solid rgba(255,182,193,0.5); }
        .card::before, .card::after { content: attr(data-value); font-size: 24px; font-weight: bold; }
        .card::before { align-self: flex-start; }
        .card::after { align-self: flex-end; transform: rotate(180deg); }
        .card-symbol { font-size: 50px; align-self: center; margin: 15px 0; }
        .card-heart, .card-diamond { color: #dc143c; }
        .card-club, .card-spade { color: #000000; }
        .card-heart::before, .card-heart::after, .card-diamond::before, .card-diamond::after { color: #dc143c; }
        .card-club::before, .card-club::after, .card-spade::before, .card-spade::after { color: #000000; }
    `;
    
    // Añadir CSS al head PRIMERO
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    // Crear el contenedor HTML YA con z-index bajo
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    cardContainer.id = 'cardContainer';
    cardContainer.style.zIndex = '-9999';
    cardContainer.style.position = 'fixed';
    cardContainer.style.top = '0';
    cardContainer.style.left = '0';
    document.body.insertBefore(cardContainer, document.body.firstChild);
    
    // Resto del código igual...
    const suits = ['heart', 'diamond', 'club', 'spade'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const symbols = { heart: '♥', diamond: '♦', club: '♣', spade: '♠' };

    function createCard(col, row) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const value = values[Math.floor(Math.random() * values.length)];
        const card = document.createElement('div');
        card.className = `card card-${suit}`;
        card.setAttribute('data-value', value);
        card.innerHTML = `<div class="card-symbol">${symbols[suit]}</div>`;
        const x = col * 300 + (row % 2 ? 100 : 0);
        const y = row * 350;
        card.style.left = `${x - 90}px`;
        card.style.top = `${y - 135}px`;
        card.style.transform = `rotate(${(row + col) % 2 ? 12 : -12}deg)`;
        return card;
    }

    function generateCards() {
        const startCol = Math.floor(-90 / 300) - 2;
        const endCol = Math.ceil((window.innerWidth + 90) / 300) + 2;
        const startRow = Math.floor(-135 / 350) - 2;
        const endRow = Math.ceil((window.innerHeight + 135) / 350) + 2;
        cardContainer.innerHTML = '';
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                cardContainer.appendChild(createCard(col, row));
            }
        }
    }

    generateCards();
    window.addEventListener('resize', generateCards);
}

// Auto-ejecutar cuando se carga el script
initCardBackground();
