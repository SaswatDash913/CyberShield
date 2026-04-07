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


app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

load_dotenv()
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



def build_graph():
    def chat_node(state: ChatState):
        response = llm.invoke([GLOBAL_PROMPT] + state["messages"])
        return {"messages": [response]}

    conn = sqlite3.connect("CyberShield.db", check_same_thread=False)
    checkpointer = SqliteSaver(conn)

    graph = StateGraph(ChatState)
    graph.add_node("chat", chat_node)
    graph.add_edge(START, "chat")
    graph.add_edge("chat", END)

    return graph.compile(checkpointer=checkpointer)


def code_analyser():
    
    print("If you have a code for me then please write END at the end: ")
    
    lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        lines.append(line)
    
    return "\n".join(lines)

@app.route("/codeanalyse",methods=["POST"])
def Builder():
    chatbot = build_graph()
    
    data = request.get_json()
    query = data.get("query")
    thread_id = data.get("user_id")   
    
    if not query or not thread_id:
        return jsonify({"error":"no querry or user_id detected"})
    
    result = chatbot.invoke(
        {"messages":[HumanMessage(content=query)]},
        config={"configurable":{"thread_id":thread_id}}
    )
    
    response = result["messages"][-1].content
    return jsonify({"response":response})

if __name__ == "__main__":
    app.run(host="localhost",port=3000)