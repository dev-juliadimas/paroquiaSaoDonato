// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyOHoLxxFVN2UUe3bN-wEZTtXa6KeIOPcro",
    authDomain: "sorteiosaodonato.firebaseapp.com",
    databaseURL: "https://sorteiosaodonato-default-rtdb.firebaseio.com",
    projectId: "sorteiosaodonato",
    storageBucket: "sorteiosaodonato.appspot.com",
    messagingSenderId: "705814125433",
    appId: "1:705814125433:web:a6472fa363e24962cecda8"
};

// Inicializa no cliente público
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    const publicPrizesContainer = document.getElementById('public-prizes-container');
    let previousWinnersCount = 0;

    // Escuta mudanças do banco de dados do Firebase instantaneamente
    db.ref('prizes').on('value', (snapshot) => {
        const data = snapshot.val();
        const prizes = data ? Object.values(data) : [];

        renderPublicPrizes(prizes);
    });

    function renderPublicPrizes(prizes) {
        if (prizes.length === 0) {
            publicPrizesContainer.innerHTML = `
                <div style="text-align:center; color:#666; padding: 40px 0;">
                    Ainda não há prêmios cadastrados para este sorteio.
                </div>
            `;
            return;
        }

        publicPrizesContainer.innerHTML = '';
        let currentWinnersCount = 0;

        prizes.forEach(prize => {
            const card = document.createElement('div');
            card.className = `public-prize-card ${prize.winner ? 'won' : ''}`;

            if (prize.winner) {
                currentWinnersCount++;
                card.innerHTML = `
                    <div class="prize-info">
                        <h4>${prize.name}</h4>
                        <p>Status: <strong style="color:#2e7d32;">Sorteado e Confirmado</strong></p>
                    </div>
                    <div class="winner-tag">
                        <div class="ticket-num">#${prize.winner.ticket}</div>
                        <div class="winner-full-name">${prize.winner.fullName}</div>
                        ${prize.winner.phone ? `<div class="winner-phone-masked">${prize.winner.phone}</div>` : ''}
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="prize-info">
                        <h4>${prize.name}</h4>
                        <p>Status: Aguardando sorteio...</p>
                    </div>
                    <div class="awaiting-tag">
                        ⏳ Sorteio em breve
                    </div>
                `;
            }

            publicPrizesContainer.appendChild(card);
        });

        // Solta confete no público se um novo ganhador acabou de ser confirmado
        if (currentWinnersCount > previousWinnersCount && previousWinnersCount !== 0) {
            if (typeof confetti === 'function') {
                confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
            }
        }
        previousWinnersCount = currentWinnersCount;
    }
});