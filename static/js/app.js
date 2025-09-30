// Variáveis do DOM
const emailInput = document.getElementById('email-input');
const fileUpload = document.getElementById('file-upload');
const processButton = document.getElementById('process-button');
const loadingIndicator = document.getElementById('loading');
const resultsSection = document.getElementById('results-section');
const categoriaResult = document.getElementById('categoria-result');
const responseResult = document.getElementById('response-result');

const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const detailsModal = document.getElementById('details-modal');

// Variáveis do Novo Pool Drag-and-Drop
const dropZone = document.getElementById('drop-zone');
const fileStatusArea = document.getElementById('file-status-area');
const selectedFileName = document.getElementById('selected-file-name');
const clearFileButton = document.getElementById('clear-file-button'); 


// -------------------------------------------------------------
// FUNÇÕES DE USABILIDADE (Limpar e Conflito)
// -------------------------------------------------------------

function clearFile(event) {
    if (event) event.preventDefault();
    
    fileUpload.value = ''; 
    
    selectedFileName.textContent = "";
    fileStatusArea.classList.add('hidden');
    clearFileButton.classList.add('hidden');
    
    checkInputConflict(); 
}

function updateFileStatus(fileName) {
    if (fileName) {
        selectedFileName.textContent = fileName;
        fileStatusArea.classList.remove('hidden');
        clearFileButton.classList.remove('hidden');
    } else {
        clearFile();
    }
}

function checkInputConflict() {
    const isTextPresent = emailInput.value.trim().length > 0;
    const isFilePresent = fileUpload.files.length > 0;
    const isConflict = isTextPresent && isFilePresent;

    emailInput.classList.toggle('conflict', isConflict);
    dropZone.classList.toggle('conflict', isConflict);
}

// -------------------------------------------------------------
// LÓGICA DO DRAG-AND-DROP E UPLOAD
// -------------------------------------------------------------

function handleFileInjection(fileList) {
    if (fileList.length === 0) return;

    const file = fileList[0];
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (fileExtension === 'txt' || fileExtension === 'pdf') {
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileUpload.files = dataTransfer.files; 
        
        updateFileStatus(fileName);
        checkInputConflict();
    } else {
        alert("Formato de arquivo não suportado. Use .txt ou .pdf.");
        clearFile();
    }
}


// Eventos do Pool para Drag and Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileInjection(files);
    }
});

// Evento do botão "Escolher Arquivo" (input oculto)
fileUpload.addEventListener('change', () => {
    handleFileInjection(fileUpload.files);
});

// Event listener para detectar digitação
emailInput.addEventListener('input', checkInputConflict);


// -------------------------------------------------------------
// FUNÇÃO PRINCIPAL DE PROCESSAMENTO
// -------------------------------------------------------------

async function processarEmail() {
    const emailContent = emailInput.value.trim();
    const uploadedFile = fileUpload.files[0]; 

    // Validação de entrada
    if (!emailContent && !uploadedFile) {
        alert("Por favor, cole o conteúdo do email ou faça upload de um arquivo.");
        return;
    }
    
    // Alerta de conflito de entrada
    if (emailContent && uploadedFile) {
        alert("ATENÇÃO: Você colou texto E anexou um arquivo. Por favor, remova um dos dois para continuar.");
        return;
    }

    // LIGA O LOADING
    loadingIndicator.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    processButton.disabled = true;

    try {
        let response;
        if (uploadedFile) {
            const formData = new FormData();
            formData.append('file', uploadedFile); 
            
            response = await fetch('/api/processar', {
                method: 'POST',
                body: formData, 
            });
        } else {
            response = await fetch('/api/processar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_content: emailContent }),
            });
        }
        
        const data = await response.json();

        categoriaResult.textContent = data.categoria || 'Erro';
        responseResult.value = data.resposta_sugerida || 'Ocorreu um erro no servidor ou na IA.';
        
        document.getElementById('titulo-resumo-output').textContent = data.titulo_resumo || 'N/A';


        const categoryLower = data.categoria.toLowerCase();
        if (categoryLower === 'produtivo') {
            categoriaResult.className = 'category-tag produtivo';
        } else if (categoryLower === 'improdutivo') {
            categoriaResult.className = 'category-tag improdutivo';
        } else {
             categoriaResult.className = 'category-tag error';
        }
        
        resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error('Erro ao comunicar com o backend:', error);
        categoriaResult.textContent = 'Falha na Rede';
        responseResult.value = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
        categoriaResult.className = 'category-tag error';
        resultsSection.classList.remove('hidden');

    } finally {
        // DESLIGA O LOADING
        loadingIndicator.classList.add('hidden');
        processButton.disabled = false;
        
        if (historySection.classList.contains('open')) { 
            loadHistoryList();
        }
    }
}

function copiarResposta() {
    responseResult.select();
    responseResult.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(responseResult.value);
    alert("Resposta copiada para a área de transferência!");
}

// -------------------------------------------------------------
// FUNÇÕES DE HISTÓRICO (Lógica da Gaveta)
// -------------------------------------------------------------

async function loadHistoryList() {
    historyList.innerHTML = '<p class="loading-history">Carregando histórico...</p>';
    try {
        const response = await fetch('/api/historico');
        const history = await response.json();

        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<p>Nenhum histórico encontrado.</p>';
            return;
        }

        history.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'history-item';
            
            const iconClass = item.categoria.toLowerCase() === 'produtivo' ? 'produtivo' : 'improdutivo';
            const titulo = item.titulo_resumo || 'Sem Título'; 

            listItem.innerHTML = `
                <div class="history-item-content">
                    <span class="history-category ${iconClass}">${item.categoria}</span>
                    <span class="history-title">${titulo}</span> 
                </div>
                <div class="history-item-actions">
                    <span class="history-time">${item.timestamp}</span>
                    <button onclick="showDetails('${item.id}')" class="details-button">Detalhes</button>
                </div>
            `;
            historyList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        historyList.innerHTML = '<p class="error">Falha ao carregar o histórico.</p>';
    }
}

function toggleHistory() {
    const isOpen = historySection.classList.contains('open');

    if (!isOpen) {
        // Abre a gaveta
        historySection.classList.remove('hidden'); // 1. Torna a DIV visível (mas fechada)
        loadHistoryList(); // 2. Carrega o conteúdo

        // 3. Adiciona a classe 'open' para disparar a animação CSS
        setTimeout(() => {
            historySection.classList.add('open');
        }, 10);
    } else {
        // Fecha a gaveta
        historySection.classList.remove('open');
        
        // 4. Espera a transição de fechamento terminar para adicionar 'hidden'
        historySection.addEventListener('transitionend', function handler() {
            if (!historySection.classList.contains('open')) {
                 historySection.classList.add('hidden'); // Adiciona o 'display: none'
            }
            historySection.removeEventListener('transitionend', handler);
        });
    }
}

async function showDetails(id) {
    try {
        const response = await fetch('/api/historico');
        const history = await response.json();
        const item = history.find(entry => entry.id === id);

        if (item) {
            document.getElementById('modal-categoria').textContent = item.categoria;
            document.getElementById('modal-categoria').className = `category-tag ${item.categoria.toLowerCase()}`;
            document.getElementById('modal-original-email').textContent = item.email_original;
            document.getElementById('modal-suggested-response').textContent = item.resposta_sugerida;
            document.getElementById('modal-title-summary').textContent = item.titulo_resumo || 'N/A';
            
            detailsModal.classList.remove('hidden');
        }
    } catch (e) {
        alert("Não foi possível carregar os detalhes do item.");
    }
}

function closeModal() {
    detailsModal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', checkInputConflict);