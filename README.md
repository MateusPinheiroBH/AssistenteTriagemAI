ASSISTENTE DE TRIAGEM INTELIGENTE DE EMAIL

O Assistente de Triagem Inteligente de Email é uma aplicação web construída com Flask e alimentada pela API Gemini que automatiza a classificação de e-mails em categorias Produtivo ou Improdutivo e sugere respostas automáticas instantaneamente. Ele suporta a entrada de texto direto e o upload de arquivos TXT e PDF para análise.

FUNCIONALIDADES PRINCIPAIS
* Classificação Inteligente: Usa o modelo Gemini (gemini-2.5-flash) para categorizar e-mails como Produtivo (requer ação imediata) ou Improdutivo (informativo/não acionável).
* Geração de Resposta: Sugere uma resposta profissional, concisa e em português baseada na classificação e no conteúdo do e-mail.
* Processamento de Arquivos: Suporta upload via drag-and-drop ou botão de arquivos .txt e .pdf (via pypdf) para análise.
* Resumo de Título: Gera um título conciso (máximo 5 palavras) que resume o assunto principal do e-mail.
* Histórico de Análises: Salva e exibe um histórico recente (limitado a 50 entradas) das análises realizadas em uma "gaveta" expansível.
* Detalhes Modais: Permite visualizar o e-mail original, a categoria e a resposta sugerida de qualquer item do histórico.

---------------------------------------------------

CONFIGURAÇÃO E INSTALAÇÃO

Siga os passos abaixo para configurar e rodar o projeto localmente.

1. PRÉ-REQUISITOS
* Python 3.8+
* Uma API Key do Google Gemini (necessária para o arquivo .env).

2. INSTALAÇÃO DAS DEPENDÊNCIAS
O projeto utiliza o Flask e a biblioteca Google GenAI.

Instale as dependências:
pip install -r requirements.txt

O arquivo requirements.txt inclui: flask, google-genai, python-dotenv, e pypdf.

3. CONFIGURAÇÃO DA CHAVE DE API

Para obter sua chave de API do Gemini:
A. Acesse o Google AI Studio: https://aistudio.google.com/
B. Faça login com sua Conta Google.
C. No painel lateral, procure por "Get API key" ou "Chave de API".
D. Clique em "Create API key in new project" (Criar chave de API em novo projeto).
E. Copie a chave gerada.

Em seguida, crie um arquivo chamado .env na raiz do projeto e adicione sua chave de API:

GEMINI_API_KEY="COLE_SUA_CHAVE_AQUI"

4. EXECUTANDO A APLICAÇÃO
Inicie o servidor Flask:
python app.py

O servidor estará disponível em http://127.0.0.1:5000/.

---------------------------------------------------

COMO USAR

1. Acesso à Interface: Abra seu navegador em http://127.0.0.1:5000/.
2. Entrada de Conteúdo: Você pode colar o texto ou fazer upload de um arquivo (.txt ou .pdf).
3. Atenção ao Conflito: O sistema impede o processamento se houver texto colado E um arquivo anexado simultaneamente, alertando o usuário.
4. Processamento: Clique em "Classificar e Sugerir Resposta".
5. Histórico: Clique em "Mostrar Histórico de Análises" para expandir a gaveta e ver as análises recentes. Use o botão "Detalhes" para visualizar os conteúdos originais e as respostas sugeridas em um modal.

---------------------------------------------------

DETALHES TÉCNICOS: COMO FUNCIONA O CÓDIGO

A aplicação segue um fluxo cliente-servidor tradicional, com o Flask (app.py) atuando como backend e o HTML/JavaScript (index.html, app.js) como frontend.

1. FLUXO DE ENTRADA E FRONTEND (app.js e index.html)
* Validação de Conflito: O JavaScript (app.js) monitora os campos de entrada (textarea e file input) e bloqueia o envio se ambos estiverem preenchidos.
* Drag-and-Drop/Upload: A função handleFileInjection(fileList) é responsável por receber arquivos, verificar a extensão (.txt ou .pdf) e injetar o arquivo no input.
* Função Principal: A função assíncrona processarEmail() em app.js:
    * Monta o objeto FormData (para arquivo) ou JSON (para texto).
    * Faz um fetch POST para /api/processar.
    * Após receber a resposta JSON, ela atualiza o DOM (results-section) com a categoria, o título resumo e a resposta sugerida.

2. FLUXO DE BACKEND E PROCESSAMENTO (app.py)
* Rotas Principais: Lida com as rotas / (renderiza HTML), /api/processar (processa a IA) e /api/historico (carrega o histórico).
* Manipulação de Conteúdo: Dentro de /api/processar:
    * Se for upload, usa read_txt_file ou read_pdf_file (via pypdf) para extrair o texto.
    * Se for JSON, pega o conteúdo do campo 'email_content'.
* Comunicação com a IA (classificar_email_e_responder):
    * Constrói um prompt detalhado para o modelo Gemini.
    * Define a configuração response_mime_type: "application/json" para forçar o retorno em JSON estruturado.
    * O modelo retorna Categoria, Resposta Sugerida e Título Resumo.
* Histórico: A função save_to_history:
    * Carrega, atualiza (mantendo os últimos 50) e salva o histórico em history.json de forma persistente.

ESTRUTURA DO PROJETO (Resumo)
* app.py: Lógica de backend Flask, comunicação com Gemini, leitura de PDF e gerenciamento de histórico (JSON).
* index.html: Estrutura da Interface de usuário (UI).
* app.js: Lógica de frontend, manipulação de drag-and-drop e interações com o histórico/modal.
* style.css: Estilização da interface.
* requirements.txt: Lista de dependências Python, incluindo pypdf.
* .env: Configuração da GEMINI_API_KEY.
* history.json: Persistência dos registros de análise.