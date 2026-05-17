import os
import sqlite3
from flask_cors import CORS
from dotenv import load_dotenv
from typing import TypedDict, Annotated
from flask import Flask, request, jsonify

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.sqlite import SqliteSaver

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

api_key = os.getenv("GEMINI_API_KEY")

GLOBAL_PROMPT = """You are a cybersecurity static analysis assistant.

Your task is to inspect code and identify suspicious or potentially malicious patterns.

You do NOT execute code.

You ONLY analyze the text and explain why it might be suspicious."""

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=1,
)


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# ── Build the graph ONCE at startup (not per request) ──────────────────────
conn = sqlite3.connect("CyberShield.db", check_same_thread=False)
checkpointer = SqliteSaver(conn)


def _build_graph():
    def chat_node(state: ChatState):
        response = llm.invoke([GLOBAL_PROMPT] + state["messages"])
        return {"messages": [response]}

    graph = StateGraph(ChatState)
    graph.add_node("chat", chat_node)
    graph.add_edge(START, "chat")
    graph.add_edge("chat", END)
    return graph.compile(checkpointer=checkpointer)


chatbot = _build_graph()


@app.route("/codeanalyse", methods=["POST"])
def analyse():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    query     = data.get("query", "").strip()
    thread_id = data.get("user_id", "").strip()

    if not query:
        return jsonify({"error": "query is required"}), 400
    if not thread_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        result = chatbot.invoke(
            {"messages": [HumanMessage(content=query)]},
            config={"configurable": {"thread_id": thread_id}},
        )
        response = result["messages"][-1].content
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "CodeBot"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
