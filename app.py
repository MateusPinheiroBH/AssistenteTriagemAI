import os
import json
from flask import Flask, request, jsonify, render_template
from google import genai
from dotenv import load_dotenv
import pypdf
from datetime import datetime

# -------------------------------------------------------------
# CONSTANTES E CONFIGURAÇÃO
# -------------------------------------------------------------
load_dotenv()
app = Flask(__name__)

HISTORY_FILE = 'history.json' 
MODEL = 'gemini-2.5-flash' 

try:
    API_KEY = os.getenv("GEMINI_API_KEY")
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY não está configurada.")
    
    client = genai.Client(api_key=API_KEY)
except (ValueError, Exception) as e:
    print(f"Erro ao inicializar o cliente Gemini: {e}")
    client = None

# -------------------------------------------------------------
# FUNÇÕES AUXILIARES
# -------------------------------------------------------------

def read_txt_file(file_stream):
    """Lê o conteúdo de um arquivo .txt."""
    return file_stream.read().decode('utf-8') 

def read_pdf_file(file_stream):
    """Lê o conteúdo de um arquivo .pdf usando pypdf."""
    try:
        reader = pypdf.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or "" + "\n"
        return text
    except Exception as e:
        print(f"Erro ao ler PDF: {e}")
        return ""

def load_history():
    """Carrega o histórico do arquivo JSON."""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            return json.loads(content) if content else []
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def save_to_history(original_content, category, suggested_response, title_summary): # NOVO ARGUMENTO
    """Salva um novo registro no histórico."""
    history = load_history()
    
    new_entry = {
        "id": datetime.now().strftime("%Y%m%d%H%M%S%f"), 
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "categoria": category,
        "titulo_resumo": title_summary, # NOVO CAMPO SALVO
        "email_original": original_content,
        "resposta_sugerida": suggested_response
    }
    
    history.insert(0, new_entry) 
    history = history[:50] 
    
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=4, ensure_ascii=False) 
    except Exception as e:
        print(f"Erro ao salvar histórico: {e}")

def classificar_email_e_responder(texto_email):
    """Usa o Gemini para classificação e geração de resposta."""
    if not client:
        return "Erro de Configuração da IA", "Verifique a GEMINI_API_KEY no .env", "Falha na IA"

    prompt = f"""
    Você é um assistente de triagem de e-mails para uma empresa. 
    Sua tarefa é analisar o e-mail abaixo e fazer três coisas:
    
    1. CLASSIFICAÇÃO: Categorizar o e-mail como 'Produtivo' (requer ação imediata, solicitação, dúvida sobre sistema/caso) ou 'Improdutivo' (saudações, agradecimentos, mensagens não acionáveis).
    2. RESPOSTA SUGERIDA: Gerar uma resposta profissional, concisa e em português baseada na classificação.
    3. TÍTULO RESUMO: Gerar um título conciso (máximo 5 palavras) que resuma o assunto principal do email.

    E-MAIL A SER ANALISADO:
    ---
    {texto_email}
    ---

    Sua resposta DEVE ser um objeto JSON no seguinte formato, e NADA MAIS:
    {{
      "categoria": "[Produtivo ou Improdutivo]",
      "resposta_sugerida": "[Sua resposta automática gerada]",
      "titulo_resumo": "[Título conciso do email]"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        
        resultado_json = json.loads(response.text)
        
        categoria = resultado_json.get('categoria', 'Não Classificado')
        resposta = resultado_json.get('resposta_sugerida', 'Não foi possível gerar uma resposta.')
        titulo = resultado_json.get('titulo_resumo', 'Sem Título') # CAPTURA O NOVO CAMPO
        
        return categoria, resposta, titulo # RETORNA OS TRÊS VALORES
        
    except Exception as e:
        print(f"Erro na chamada da IA: {e}")
        return "Erro de Processamento", f"Falha na API: {str(e)}", "Falha na IA"

# -------------------------------------------------------------
# ROTAS FLASK
# -------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/processar', methods=['POST'])
def processar_email():
    email_content = ""

    # 1. Tenta ler do upload de arquivo (Multipart/form-data)
    if 'file' in request.files and request.files['file'].filename != '':
        uploaded_file = request.files['file']
        filename = uploaded_file.filename.lower()

        if filename.endswith('.txt'):
            email_content = read_txt_file(uploaded_file.stream)
        elif filename.endswith('.pdf'):
            email_content = read_pdf_file(uploaded_file.stream)
        else:
            return jsonify({"categoria": "Erro", "resposta_sugerida": "Formato de arquivo não suportado (.txt ou .pdf)."}), 400

    # 2. Tenta ler do textarea (JSON)
    elif request.is_json:
        data = request.get_json()
        email_content = data.get('email_content', '').strip()
    
    # 3. Validação final do conteúdo
    if not email_content:
        return jsonify({"categoria": "Erro", "resposta_sugerida": "Por favor, insira o conteúdo do email ou faça upload de um arquivo para análise."}), 400
    
    # Chamada à função de IA
    categoria, resposta_sugerida, titulo_resumo = classificar_email_e_responder(email_content)
    
    # Salva no histórico se não houve erro grave
    if categoria not in ("Erro", "Erro de Configuração da IA", "Erro de Processamento"):
        save_to_history(email_content, categoria, resposta_sugerida, titulo_resumo) # ENVIA O NOVO CAMPO
    
    return jsonify({
        "categoria": categoria,
        "resposta_sugerida": resposta_sugerida,
        "titulo_resumo": titulo_resumo # RETORNA O NOVO CAMPO PARA O FRONTEND
    })

@app.route('/api/historico', methods=['GET'])
def get_historico():
    history = load_history()
    return jsonify(history) 

if __name__ == '__main__':
    # O Render define a porta na variável de ambiente PORT.
    # 5000 é usado como fallback (padrão) para desenvolvimento local.
    port = int(os.environ.get("PORT", 5000))

    # O host '0.0.0.0' diz ao servidor para aceitar conexões de qualquer IP,
    # o que é essencial para rodar em ambientes de nuvem como o Render.
    app.run(host='0.0.0.0', port=port, debug=True)