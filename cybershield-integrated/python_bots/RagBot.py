import os
import re
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyMuPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Base directory where all indexes are stored
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
INDEX_ROOT = os.path.join(BASE_DIR, "faiss_indexes")
os.makedirs(INDEX_ROOT, exist_ok=True)

EMBEDDINGS = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
)


def safe_user_dir(user_id: str) -> str:
    """Strip any characters unsafe for folder names."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", user_id)


def get_index_path(user_id: str) -> str:
    return os.path.join(INDEX_ROOT, safe_user_dir(user_id))


def index_exists(user_id: str) -> bool:
    path = get_index_path(user_id)
    if not os.path.isdir(path):
        return False
    files = os.listdir(path)
    print(f"[RagBot] Index dir={path}, files={files}")
    return len(files) > 0


def load_document(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    print(f"[RagBot] Loading {ext} file: {file_path}")
    if ext == ".pdf":
        loader = PyMuPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    else:
        return []
    docs = loader.load()
    print(f"[RagBot] Loaded {len(docs)} pages/sections")
    return docs


def split_text(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=40)
    chunks = splitter.split_documents(docs)
    print(f"[RagBot] Split into {len(chunks)} chunks")
    return chunks


def create_index(splits, save_path: str):
    print(f"[RagBot] Creating FAISS index at {save_path}")
    store = FAISS.from_documents(splits, embedding=EMBEDDINGS)
    store.save_local(save_path)
    print(f"[RagBot] Index saved. Files: {os.listdir(save_path)}")
    return store


def load_index(save_path: str):
    return FAISS.load_local(
        save_path,
        EMBEDDINGS,
        allow_dangerous_deserialization=True,
    )


def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.5,
    )


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def rag_answer(faiss_index, question: str) -> str:
    prompt = ChatPromptTemplate.from_template(
        "You are a helpful assistant. Answer ONLY using the context provided below.\n"
        "If the answer cannot be found in the context, respond with exactly: NO_CONTEXT\n\n"
        "Context:\n{context}\n\n"
        "Question:\n{question}\n\n"
        "Answer:"
    )
    retriever = faiss_index.as_retriever(search_kwargs={"k": 6})
    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | get_llm()
        | StrOutputParser()
    )
    return chain.invoke(question)


def normal_answer(question: str) -> str:
    return get_llm().invoke(question).content


# ── POST /fileup ──────────────────────────────────────────────────────────────
@app.route("/fileup", methods=["POST"])
def file_upload():
    print(f"[RagBot] /fileup called. Files: {list(request.files.keys())}, Form: {dict(request.form)}")

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file    = request.files["file"]
    user_id = request.form.get("user_id", "").strip()

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    # Save uploaded file temporarily
    safe_name  = secure_filename(file.filename)
    upload_dir = os.path.join(BASE_DIR, "uploads", safe_user_dir(user_id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, safe_name)
    file.save(file_path)
    print(f"[RagBot] File saved to {file_path} ({os.path.getsize(file_path)} bytes)")

    # Load and embed
    docs = load_document(file_path)
    if not docs:
        return jsonify({"error": "Could not read file. Make sure it is a valid PDF or DOCX."}), 400

    splits    = split_text(docs)
    index_dir = get_index_path(user_id)
    os.makedirs(index_dir, exist_ok=True)
    create_index(splits, index_dir)

    return jsonify({
        "message": "File uploaded and embedded successfully.",
        "chunks":  len(splits),
        "user_id": user_id,
    })


# ── POST /chatnode ────────────────────────────────────────────────────────────
@app.route("/chatnode", methods=["POST"])
def chat_node():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    user_id    = data.get("user_id", "").strip()
    user_input = data.get("query", "").strip()

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if not user_input:
        return jsonify({"error": "query is required"}), 400

    has_index = index_exists(user_id)
    print(f"[RagBot] /chatnode user={user_id}, has_index={has_index}")

    if has_index:
        try:
            faiss_index = load_index(get_index_path(user_id))
            response    = rag_answer(faiss_index, user_input)
            print(f"[RagBot] RAG raw response: {response[:120]}")
            if not response or response.strip() == "NO_CONTEXT":
                print("[RagBot] No context found, falling back to normal LLM")
                response = normal_answer(user_input)
        except Exception as e:
            print(f"[RagBot] RAG error: {e}")
            response = normal_answer(user_input)
    else:
        print(f"[RagBot] No index for user={user_id}, using normal LLM")
        response = normal_answer(user_input)

    return jsonify({"response": response})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":      "ok",
        "service":     "RagBot",
        "index_root":  INDEX_ROOT,
        "users_indexed": os.listdir(INDEX_ROOT) if os.path.exists(INDEX_ROOT) else [],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
