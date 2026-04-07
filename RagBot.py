import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyMuPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import SQLChatMessageHistory

file_path = None

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})


def DocumentLoader(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        loader = PyMuPDFLoader(file_path)
    elif ext == ".docx":
        loader = Docx2txtLoader(file_path)
    else:
        return []
    return loader.load()


def splitText(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=100,
        chunk_overlap=20
    )
    return splitter.split_documents(docs)


def EmbeddingsCreation(splits, save_path):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}
    )

    faiss_store = FAISS.from_documents(
        splits,
        embedding=embeddings
    )

    faiss_store.save_local(save_path)
    return faiss_store


def GetEmbeddings(save_path):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}
    )

    faiss_index = FAISS.load_local(
        save_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True
    )
    return faiss_index


def GetMemory(user_id):
    return ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        chat_memory=SQLChatMessageHistory(
            session_id=str(user_id),
            connection_string="sqlite:///BetterRag.db"
        )
    )


def prompttemplate():
    return PromptTemplate(
        template="""
Use the provided context to answer the question.
If the answer is not present, simply return no context.

Context:
{context}

Question:
{question}

Answer:
""",
        input_variables=["context", "question"]
    )


def LLMcall(faiss_index, user_id):
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=api_key,
        temperature=0.5
    )

    memory = GetMemory(user_id)
    prompt = prompttemplate()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=faiss_index.as_retriever(search_kwargs={"k": 4}),
        chain_type_kwargs={"prompt": prompt},
        memory=memory
    )

    return qa_chain


def normalAnswer(user_input, user_id):
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=api_key,
        temperature=0.5
    )

    response = llm.invoke(user_input)
    return response.content


@app.route("/fileup", methods=["POST"])
def FileUpload():
    global file_path

    file = request.files['file']
    data = request.form
    user_iden = data.get('user_id')

    file_name = secure_filename(file.filename)
    file_path = os.path.join("uploads", file_name)

    os.makedirs("uploads", exist_ok=True)
    file.save(file_path)

    docs = DocumentLoader(file_path)
    splits = splitText(docs)

    os.makedirs("faiss_index", exist_ok=True)
    save_path = os.path.join("faiss_index", "sample")

    EmbeddingsCreation(splits, save_path)

    return jsonify({"message": "File uploaded and processed"})


@app.route("/chatnode", methods=["POST"])
def ChatNode():
    global file_path

    data = request.json
    user_iden = data.get("user_id")
    user_input = data.get("query")

    if file_path is not None:
        save_path = os.path.join("faiss_index", "sample")
        faiss_index = GetEmbeddings(save_path)
        qa_chain = LLMcall(faiss_index, user_iden)
        result = qa_chain.invoke({"query": user_input})
        
        if not result or "no context" in result["result"].lower():
            response = normalAnswer(user_input, user_iden)
        else:
            response = result["result"]
    else:
        response = normalAnswer(user_input, user_iden)
        
    return jsonify({"response": response})


if __name__ == "__main__":
    app.run(host="localhost", port=5000)