"""Offline preview: lexical document lookup and verbatim excerpts, never an LLM simulation."""

import math
import re
from collections import Counter

from backend import kb, rag

STOP = set(
    "a an the is are was were what how tell me about of for in to and his he does can i you aoun".split()
)


def tokens(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z0-9]+", text.lower()) if word not in STOP]


def retrieve(question: str, history=()) -> list[dict]:
    chunks = kb.build_chunks()
    query = tokens(rag._query_text(question, rag.safe_history(history)))
    documents = [tokens(c.text) for c in chunks]
    frequencies = Counter(word for document in documents for word in set(document))
    scored = []
    for chunk, document in zip(chunks, documents):
        counts = Counter(document)
        score = sum(
            math.log(1 + len(chunks) / (1 + frequencies[word])) * counts[word] / (counts[word] + 1)
            for word in set(query)
            if counts[word]
        )
        if score:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    selected, counts = [], Counter()
    for _, chunk in scored:
        if counts[chunk.source] >= 1:
            continue
        counts[chunk.source] += 1
        selected.append({"id": f"S{len(selected) + 1}", "text": chunk.text, **chunk.metadata()})
        if len(selected) == 3:
            break
    return selected


def answer(question: str, history=()):
    question = rag.clean_question(question)
    if re.search(r"\b(phone|mobile|salary|address|ignore|instructions|system prompt)\b", question, re.I):
        return (
            "That information is not available here. You can explore Aoun's published projects or contact links.",
            [],
        )
    chunks = retrieve(question, history)
    if not chunks:
        return (
            "I couldn't find a matching passage in Aoun's published profile. "
            "Try asking about DataBuddy, AskOne, education, skills, or contact details."
        ), []
    lines = [
        "Here are matching passages from Aoun's published portfolio. **Offline preview uses keyword lookup, not AI generation.**"
    ]
    for chunk in chunks[:2]:
        body = chunk["text"].split("\n\n", 1)[-1]
        lines.append(f"### {chunk['title']} [{chunk['id']}]\n\n{body}")
    return "\n\n".join(lines), chunks
