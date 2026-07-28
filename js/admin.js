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

// Inicializa o Firebase no Admin
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const fileNameText = document.getElementById('file-name-text');
    const btnChangeFile = document.getElementById('btn-change-file');

    const prizesSection = document.getElementById('prizes-section');
    const prizeNameInput = document.getElementById('prize-name-input');
    const btnAddPrize = document.getElementById('btn-add-prize');
    const prizesList = document.getElementById('prizes-list');
    const selectCurrentPrize = document.getElementById('select-current-prize');

    const searchSection = document.getElementById('search-section');
    const digitBoxes = Array.from(document.querySelectorAll('.digit-box'));
    const realNumberDisplay = document.getElementById('real-number-display');
    const counterText = document.getElementById('counter-text');
    const btnCheck = document.getElementById('btn-check');

    const suspenseModal = document.getElementById('suspense-modal');
    const countdownWrapper = document.getElementById('countdown-wrapper');
    const countdownNumber = document.getElementById('countdown-number');
    const winnerResult = document.getElementById('winner-result');
    const notFoundResult = document.getElementById('not-found-result');
    const modalPrizeTitle = document.getElementById('modal-prize-title');
    const winnerTicket = document.getElementById('winner-ticket');
    const winnerName = document.getElementById('winner-name');
    const winnerPhone = document.getElementById('winner-phone');
    const btnConfirmWinner = document.getElementById('btn-confirm-winner');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnCloseModalNf = document.getElementById('btn-close-modal-nf');

    // Modal de Detalhes de Contato Completo
    const contactDetailsModal = document.getElementById('contact-details-modal');
    const contactModalTicket = document.getElementById('contact-modal-ticket');
    const contactModalPrize = document.getElementById('contact-modal-prize');
    const contactModalName = document.getElementById('contact-modal-name');
    const contactModalPhone = document.getElementById('contact-modal-phone');
    const btnCloseContactModal = document.getElementById('btn-close-contact-modal');

    // Estado da Aplicação
    let ticketsData = [];
    let prizes = [];
    let currentCandidate = null;

    // Sincroniza prêmios do Firebase em tempo real
    db.ref('prizes').on('value', (snapshot) => {
        const data = snapshot.val();
        prizes = data ? Object.values(data) : [];
        renderPrizes();
    });

    // 1. CARREGAMENTO DA PLANILHA (SheetJS)
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#f7f2e7';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '#fdfbf7';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#fdfbf7';
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            
            ticketsData = [];
            const startRow = isNaN(parseInt(rows[0]?.[0])) ? 1 : 0;

            for (let i = startRow; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[0]) continue;
                
                const buyerName = row[1] ? String(row[1]).trim() : '';
                const rawPhoneStr = row[2] ? String(row[2]).trim() : '';

                // 🛑 REGRA: Se o nome do comprador estiver em branco, ignora (trata como NÃO VENDIDO)
                if (!buyerName) continue;

                ticketsData.push({
                    ticket: String(row[0]).trim().padStart(5, '0'),
                    name: buyerName,
                    rawPhone: rawPhoneStr || 'Não informado',
                    maskedPhone: formatPhoneMasked(rawPhoneStr)
                });
            }

            if (ticketsData.length > 0) {
                fileNameText.textContent = `📂 ${file.name} (${ticketsData.length} bilhetes vendidos carregados)`;
                dropZone.classList.add('hidden');
                fileInfo.classList.remove('hidden');
                prizesSection.classList.remove('disabled');
                searchSection.classList.remove('disabled');
                toggleDigitBoxes(true);
                updateCounter(ticketsData.length);
            } else {
                alert('Nenhum bilhete vendido/válido com nome preenchido foi encontrado na planilha.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    btnChangeFile.addEventListener('click', () => {
        fileInput.value = '';
        ticketsData = [];
        dropZone.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        prizesSection.classList.add('disabled');
        searchSection.classList.add('disabled');
        toggleDigitBoxes(false);
        resetDigitBoxes();
    });

    // 2. GESTÃO DE PRÊMIOS (Firebase)
    btnAddPrize.addEventListener('click', () => {
        const name = prizeNameInput.value.trim();
        if (!name) return;

        const newId = Date.now();
        const newPrize = { id: newId, name, winner: null };
        
        db.ref('prizes/' + newId).set(newPrize);
        prizeNameInput.value = '';
    });

    function renderPrizes() {
        prizesList.innerHTML = '';
        selectCurrentPrize.innerHTML = '<option value="">-- Selecione o Prêmio --</option>';

        prizes.forEach(prize => {
            const li = document.createElement('li');
            
            if (prize.winner) {
                li.innerHTML = `
                    <span>
                        <strong>${prize.name}</strong> 
                        <br>
                        <span class="winner-clickable-link" onclick="openContactModal(${prize.id})">
                            👤 Ganhador: #${prize.winner.ticket} - ${prize.winner.fullName} 🔍 <em>(Ver contato)</em>
                        </span>
                    </span>
                    <button onclick="removePrize(${prize.id})" class="btn-text" style="color:#d32f2f;">Remover</button>
                `;
            } else {
                li.innerHTML = `
                    <span><strong>${prize.name}</strong></span>
                    <button onclick="removePrize(${prize.id})" class="btn-text" style="color:#d32f2f;">Remover</button>
                `;

                const opt = document.createElement('option');
                opt.value = prize.id;
                opt.textContent = prize.name;
                selectCurrentPrize.appendChild(opt);
            }

            prizesList.appendChild(li);
        });
    }

    window.openContactModal = (prizeId) => {
        const prize = prizes.find(p => String(p.id) === String(prizeId));
        if (prize && prize.winner) {
            contactModalTicket.textContent = `#${prize.winner.ticket}`;
            contactModalPrize.textContent = prize.name;
            contactModalName.textContent = prize.winner.fullName;
            contactModalPhone.textContent = prize.winner.rawPhone || 'Não informado';
            contactDetailsModal.classList.remove('hidden');
        }
    };

    btnCloseContactModal.addEventListener('click', () => {
        contactDetailsModal.classList.add('hidden');
    });

    window.removePrize = (id) => {
        db.ref('prizes/' + id).remove();
    };

    // 3. DIGITAÇÃO DIRETA
    function toggleDigitBoxes(enabled) {
        digitBoxes.forEach(box => {
            box.disabled = !enabled;
            if (!enabled) box.value = '';
        });
    }

    function getTicketValue() {
        return digitBoxes.map(box => box.value).join('');
    }

    function resetDigitBoxes() {
        digitBoxes.forEach(box => box.value = '');
        realNumberDisplay.textContent = '-----';
        btnCheck.disabled = true;
        if (digitBoxes[0] && !digitBoxes[0].disabled) digitBoxes[0].focus();
    }

    digitBoxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            box.value = val;

            if (val && index < digitBoxes.length - 1) {
                digitBoxes[index + 1].focus();
            }

            handleDigitChange();
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && index > 0) {
                digitBoxes[index - 1].focus();
            }
        });

        box.addEventListener('focus', () => box.select());
    });

    function handleDigitChange() {
        const ticketVal = getTicketValue();

        if (ticketVal.length > 0) {
            realNumberDisplay.textContent = ticketVal.padEnd(5, '*');
        } else {
            realNumberDisplay.textContent = '-----';
        }

        const matches = ticketsData.filter(item => item.ticket.startsWith(ticketVal));
        updateCounter(matches.length);

        btnCheck.disabled = !(ticketVal.length === 5 && selectCurrentPrize.value !== '');
    }

    selectCurrentPrize.addEventListener('change', () => {
        const ticketVal = getTicketValue();
        btnCheck.disabled = !(ticketVal.length === 5 && selectCurrentPrize.value !== '');
    });

    function updateCounter(count) {
        counterText.textContent = `${count} / ${ticketsData.length} números possíveis`;
    }

    function formatPhoneMasked(phoneStr) {
        if (!phoneStr) return 'Telefone não informado';
        const clean = phoneStr.replace(/\D/g, '');
        if (clean.length >= 10) {
            const ddd = clean.substring(0, 2);
            const prefix = clean.length === 11 ? clean.substring(2, 7) : clean.substring(2, 6);
            return `(${ddd}) ${prefix}-****`;
        }
        return phoneStr;
    }

    // 4. SUSPENSE E CONFIRMAÇÃO (BLOQUEIO DE DUPLO SORTEIO & NOME VAZIO)
    btnCheck.addEventListener('click', () => {
        const targetTicketNumber = getTicketValue();
        const selectedPrizeId = selectCurrentPrize.value;
        const prize = prizes.find(p => String(p.id) === String(selectedPrizeId));

        // 🛑 REGRA 1: Impedir que um mesmo número seja sorteado duas vezes
        const alreadyWonPrize = prizes.find(p => p.winner && p.winner.ticket === targetTicketNumber);

        if (alreadyWonPrize) {
            alert(`⚠️ O bilhete #${targetTicketNumber} JÁ FOI SORTEADO no prêmio: "${alreadyWonPrize.name}"!\n\nUm número não pode ser sorteado duas vezes. Por favor, digite outro número.`);
            resetDigitBoxes();
            return;
        }

        suspenseModal.classList.remove('hidden');
        countdownWrapper.classList.remove('hidden');
        winnerResult.classList.add('hidden');
        notFoundResult.classList.add('hidden');

        let count = 5;
        countdownNumber.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                clearInterval(interval);
                countdownWrapper.classList.add('hidden');
                
                // Busca se o número foi vendido e se tem nome preenchido
                const winner = ticketsData.find(item => item.ticket === targetTicketNumber);

                if (winner && winner.name) {
                    currentCandidate = {
                        prizeId: selectedPrizeId,
                        ticket: winner.ticket,
                        fullName: winner.name,
                        rawPhone: winner.rawPhone,
                        maskedPhone: winner.maskedPhone
                    };

                    modalPrizeTitle.textContent = prize.name.toUpperCase();
                    winnerTicket.textContent = `#${winner.ticket}`;
                    winnerName.textContent = winner.name;
                    winnerPhone.textContent = `Contato: ${winner.maskedPhone}`;
                    winnerResult.classList.remove('hidden');
                    
                    // Solta confete APENAS se houver um ganhador real
                    if (typeof confetti === 'function') {
                        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                    }
                } else {
                    // 🛑 REGRA 2: Se o número for inexistente ou sem nome na planilha -> "Número não vendido" e SEM confete
                    document.getElementById('not-found-ticket').textContent = `#${targetTicketNumber}`;
                    notFoundResult.classList.remove('hidden');
                }
            }
        }, 1000);
    });

    btnConfirmWinner.addEventListener('click', () => {
        if (!currentCandidate) return;

        const winnerObj = {
            ticket: currentCandidate.ticket,
            fullName: currentCandidate.fullName,
            rawPhone: currentCandidate.rawPhone,
            phone: currentCandidate.maskedPhone
        };

        db.ref(`prizes/${currentCandidate.prizeId}/winner`).set(winnerObj).then(() => {
            alert(`✅ Vencedor confirmado e liberado para o público!`);
        });

        suspenseModal.classList.add('hidden');
        resetDigitBoxes();
    });

    [btnCancelModal, btnCloseModalNf].forEach(btn => {
        btn.addEventListener('click', () => suspenseModal.classList.add('hidden'));
    });
});