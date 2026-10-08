"""
Agentic RAG Service — Production Grade

Features:
  • Hybrid routing (DOCUMENT / CHAT / GENERAL / HYBRID)
  • Multi-query retrieval with Reciprocal Rank Fusion (RRF)
  • Cross-encoder re-ranking with graceful fallback
  • Map-Reduce for summarize/compare/list-all questions (parallelized)
  • Post-answer re-routing verification loop
  • Persistent vector store (survives restarts)
  • Multi-document support (append-only uploads)
"""

import io
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Iterable, List, Tuple

from dotenv import load_dotenv
from pypdf import PdfReader

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq

try:
    from sentence_transformers import CrossEncoder
    _RERANKER_AVAILABLE = True
except ImportError:
    _RERANKER_AVAILABLE = False
    print("⚠️  sentence-transformers not available — reranker disabled")

load_dotenv()

# ═════════════════════════════════════════════════════════
# CONFIG
# ═════════════════════════════════════════════════════════
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
GROQ_MODEL = "openai/gpt-oss-120b"

# Retrieval config
INITIAL_K = 12
RERANK_TOP_K = 4
MULTI_QUERY_COUNT = 3
RRF_K = 60
MAP_REDUCE_THRESHOLD = 6
MAX_WORKERS = 4

# Persistence
CHROMA_DIR = "./chroma_db"
CHROMA_COLLECTION = "rag_collection"


# ═════════════════════════════════════════════════════════
# RERANKER SINGLETON
# ═════════════════════════════════════════════════════════
class _RerankerHolder:
    _instance = None

    @classmethod
    def get(cls):
        if cls._instance is None and _RERANKER_AVAILABLE:
            print(f"⏳ Loading reranker: {RERANKER_MODEL} ...")
            cls._instance = CrossEncoder(RERANKER_MODEL, max_length=512)
            print("✅ Reranker loaded.")
        return cls._instance


class RAGService:
    def __init__(self):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self.llm = ChatGroq(model=GROQ_MODEL, temperature=0)
        self.reranker = _RerankerHolder.get()

        # ─── Prompts & chains ───
        self._build_prompts()
        self._build_chains()

        self.agent_steps: List[str] = []
        self.uploaded_doc_names: List[str] = []

        # ─── Load persistent Chroma on startup ───
        self._load_or_init_vector_store()

    # ═════════════════════════════════════════════════════
    # VECTOR STORE INITIALIZATION
    # ═════════════════════════════════════════════════════
    def _load_or_init_vector_store(self):
        """Load existing Chroma DB from disk, or create empty one."""
        try:
            self.vector_store = Chroma(
                collection_name=CHROMA_COLLECTION,
                embedding_function=self.embedding_model,
                persist_directory=CHROMA_DIR,
            )

            # Try to recover doc names from existing collection
            try:
                existing = self.vector_store._collection.get()
                if existing and existing.get("metadatas"):
                    names = {
                        m.get("source")
                        for m in existing["metadatas"]
                        if m.get("source")
                    }
                    self.uploaded_doc_names = sorted(list(names))
                    count = len(existing.get("ids", []))
                    print(
                        f"✅ Loaded persistent Chroma: {count} chunks, "
                        f"{len(self.uploaded_doc_names)} docs → {self.uploaded_doc_names}"
                    )
                else:
                    print("✅ Persistent Chroma initialized (empty)")
            except Exception as e:
                print(f"⚠️ Could not read existing collection metadata: {e}")
                self.uploaded_doc_names = []

        except Exception as e:
            print(f"⚠️ Could not load Chroma from disk: {e}")
            self.vector_store = None

    # ═════════════════════════════════════════════════════
    # PROMPTS
    # ═════════════════════════════════════════════════════
    def _build_prompts(self):
        self.decision_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a routing agent. Classify the user's question into ONE of:\n"
             "- DOCUMENT : about the uploaded PDFs\n"
             "- CHAT     : about previous conversation(s)\n"
             "- GENERAL  : general knowledge\n"
             "- HYBRID   : needs BOTH document AND chat (compare, cross-reference)\n\n"
             "Return ONLY the single word.\n\n"
             "--- CURRENT CHAT ---\n{current_history}\n\n"
             "--- OTHER CHATS ---\n{cross_chat_history}\n\n"
             "Question: {question}\n\n"
             "Answer (one word):")
        ])

        self.context_check_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Grade whether the retrieved context is sufficient to answer the "
             "question. Return ONLY 'YES' or 'NO'.\n\n"
             "Context:\n{context}\n\nQuestion: {question}\n\nGrade:")
        ])

        self.multi_query_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Generate {n} different search queries that would help find "
             "information to answer the user's question. Output ONE query per "
             "line, no numbering, no extra text.\n\n"
             "Question: {question}\n\nQueries:")
        ])

        self.map_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Extract any information from this excerpt relevant to the "
             "question. Be concise (1-2 sentences).\n"
             "If nothing is relevant, reply exactly: NOT_RELEVANT\n\n"
             "Excerpt:\n{chunk}\n\nQuestion: {question}\n\nAnswer:")
        ])

        self.reduce_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Combine these partial answers into ONE coherent final answer. "
             "Ignore anything marked NOT_RELEVANT. If all are NOT_RELEVANT, "
             "say: \"I couldn't find that information in the document.\"\n\n"
             "Question: {question}\n\nPartials:\n{partials}\n\nFinal answer:")
        ])

        self.reroute_check_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "The first attempt used only '{source_used}'. Decide if this "
             "answer is complete or if another source might help.\n\n"
             "Reply ONLY: DONE or REROUTE\n\n"
             "Question: {question}\nAnswer: {answer}\n\nVerdict:")
        ])

        self.answer_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a helpful assistant. You have THREE sources:\n"
             "1. DOCUMENT CONTEXT — facts from PDFs\n"
             "2. CURRENT CHAT HISTORY — this conversation\n"
             "3. OTHER CHAT SESSIONS — previous conversations\n\n"
             "Rules:\n"
             "- Answer document questions ONLY from SOURCE 1\n"
             "- Answer chat-history questions ONLY from SOURCE 2/3\n"
             "- Never mix sources unless the question asks to compare\n"
             "- Never mention session IDs\n"
             "- If info is missing, say so honestly\n"
             "- Format your response in clean Markdown when helpful "
             "(bold, lists, code blocks)\n\n"
             "=== SOURCE 1: DOCUMENT CONTEXT ===\n{context}\n\n"
             "=== SOURCE 2: CURRENT CHAT HISTORY ===\n{current_history}\n\n"
             "=== SOURCE 3: OTHER CHAT SESSIONS ===\n{cross_chat_history}\n\n"
             "Question: {question}\n\nAnswer:")
        ])

    def _build_chains(self):
        self.decision_chain = self.decision_prompt | self.llm | StrOutputParser()
        self.context_check_chain = self.context_check_prompt | self.llm | StrOutputParser()
        self.multi_query_chain = self.multi_query_prompt | self.llm | StrOutputParser()
        self.map_chain = self.map_prompt | self.llm | StrOutputParser()
        self.reduce_chain = self.reduce_prompt | self.llm | StrOutputParser()
        self.reroute_check_chain = self.reroute_check_prompt | self.llm | StrOutputParser()
        self.answer_chain = self.answer_prompt | self.llm | StrOutputParser()

    # ═════════════════════════════════════════════════════
    # DOCUMENT MANAGEMENT — Multi-doc aware
    # ═════════════════════════════════════════════════════
    def process_documents(self, uploaded_files: Iterable):
        """
        Extract, split, and ADD chunks to the existing vector store.
        Multiple uploads ACCUMULATE — nothing gets wiped.
        """
        documents: List[Document] = []

        for uploaded_file in uploaded_files:
            file_bytes = uploaded_file.getvalue()
            reader = PdfReader(io.BytesIO(file_bytes))
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    documents.append(Document(
                        page_content=text,
                        metadata={"source": uploaded_file.name, "page": page_num}
                    ))

        if not documents:
            return 0

        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
        chunks = splitter.split_documents(documents)

        # ✅ Ensure vector store exists (creates persistent if missing)
        if self.vector_store is None:
            self.vector_store = Chroma(
                collection_name=CHROMA_COLLECTION,
                embedding_function=self.embedding_model,
                persist_directory=CHROMA_DIR,
            )

        # ✅ ADD (append) chunks — does NOT wipe existing data
        self.vector_store.add_documents(chunks)

        # ✅ Merge doc names (don't replace)
        new_names = {d.metadata["source"] for d in documents}
        for name in new_names:
            if name not in self.uploaded_doc_names:
                self.uploaded_doc_names.append(name)

        print(
            f"✅ Indexed {len(chunks)} chunks from {len(new_names)} doc(s). "
            f"Total docs: {self.uploaded_doc_names}"
        )
        return len(chunks)

    def delete_document(self, doc_name: str) -> bool:
        """Delete only the specified document's chunks."""
        if not self.vector_store:
            return False
        try:
            self.vector_store._collection.delete(where={"source": doc_name})
            if doc_name in self.uploaded_doc_names:
                self.uploaded_doc_names.remove(doc_name)
            print(f"🗑️  Deleted document: {doc_name}")
            return True
        except Exception as e:
            print(f"Delete error: {e}")
            return False

    def clear_all_documents(self):
        """Delete all documents and recreate empty collection."""
        if self.vector_store:
            try:
                self.vector_store.delete_collection()
            except Exception:
                pass
        # Recreate empty persistent collection
        self.vector_store = Chroma(
            collection_name=CHROMA_COLLECTION,
            embedding_function=self.embedding_model,
            persist_directory=CHROMA_DIR,
        )
        self.uploaded_doc_names = []
        print("🗑️  Cleared all documents.")

    def format_context(self, docs: List[Document]) -> str:
        if not docs:
            return "(No document context retrieved.)"
        return "\n\n".join(
            f"[{d.metadata['source']} p.{d.metadata['page']}]\n{d.page_content}"
            for d in docs
        )

    # ═════════════════════════════════════════════════════
    # RE-RANKING
    # ═════════════════════════════════════════════════════
    def rerank(self, query: str, docs: List[Document], top_k: int = RERANK_TOP_K) -> List[Document]:
        if not docs:
            return []
        if self.reranker is None:
            self.agent_steps.append("⚠️ Reranker unavailable — using vector order")
            return docs[:top_k]

        try:
            t0 = time.time()
            pairs = [(query, d.page_content) for d in docs]
            scores = self.reranker.predict(pairs, batch_size=8, show_progress_bar=False)
            ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)

            elapsed = time.time() - t0
            best = ranked[0][1]
            self.agent_steps.append(
                f"🎯 Reranked {len(docs)} → top {top_k} "
                f"in {elapsed:.2f}s (best={best:.2f})"
            )
            return [d for d, _ in ranked[:top_k]]
        except Exception as e:
            self.agent_steps.append(f"⚠️ Rerank failed ({e}) — using vector order")
            return docs[:top_k]

    # ═════════════════════════════════════════════════════
    # MULTI-QUERY + RRF FUSION
    # ═════════════════════════════════════════════════════
    def _generate_multi_queries(self, question: str, n: int = MULTI_QUERY_COUNT) -> List[str]:
        try:
            raw = self.multi_query_chain.invoke({"question": question, "n": n})
            queries = [q.strip("-•* \t") for q in raw.split("\n") if q.strip()]
            queries = [q for q in queries if len(q) > 5][:n]
            return [question] + queries
        except Exception:
            return [question]

    @staticmethod
    def _reciprocal_rank_fusion(
        results_per_query: List[List[Document]],
        k: int = RRF_K,
    ) -> List[Document]:
        scores: dict = {}
        doc_map: dict = {}
        for results in results_per_query:
            for rank, doc in enumerate(results, start=1):
                key = (doc.metadata["source"], doc.metadata["page"], doc.page_content[:100])
                scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank)
                doc_map[key] = doc
        ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [doc_map[k] for k, _ in ordered]

    # ═════════════════════════════════════════════════════
    # MAP-REDUCE
    # ═════════════════════════════════════════════════════
    @staticmethod
    def _is_map_reduce_question(question: str) -> bool:
        q = question.lower()
        triggers = (
            "summarize", "summarise", "summary", "overview",
            "compare", "comparison", "difference between",
            "all ", "every ", "list all", "list every",
            "main points", "key points", "key takeaways",
            "across the document", "throughout", "whole document",
            "entire document", "entire pdf", "everything about",
        )
        return any(t in q for t in triggers)

    def _map_one(self, chunk: Document, question: str) -> Tuple[Document, str]:
        try:
            partial = self.map_chain.invoke({
                "chunk": chunk.page_content[:2000],
                "question": question,
            }).strip()
            return chunk, partial
        except Exception as e:
            return chunk, f"NOT_RELEVANT (error: {e})"

    def map_reduce_answer(self, question: str, docs: List[Document]) -> str:
        self.agent_steps.append(f"🗺️  MAP-REDUCE over {len(docs)} chunks (parallel)")

        t0 = time.time()
        partials: List[str] = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = [pool.submit(self._map_one, d, question) for d in docs]
            for fut in as_completed(futures):
                _, partial = fut.result()
                if partial and "NOT_RELEVANT" not in partial.upper():
                    partials.append(partial)

        elapsed = time.time() - t0
        self.agent_steps.append(f"   ✓ {len(partials)}/{len(docs)} chunks relevant in {elapsed:.2f}s")

        if not partials:
            return "I couldn't find that information in the document."

        self.agent_steps.append(f"🔻 REDUCE: merging {len(partials)} partials")
        combined = "\n\n".join(f"--- Part {i+1} ---\n{p}" for i, p in enumerate(partials))
        return self.reduce_chain.invoke({"question": question, "partials": combined})

    # ═════════════════════════════════════════════════════
    # RE-ROUTING
    # ═════════════════════════════════════════════════════
    def _should_reroute(self, question: str, source_used: str, answer: str) -> bool:
        try:
            verdict = self.reroute_check_chain.invoke({
                "question": question,
                "source_used": source_used,
                "answer": answer[:800],
            }).strip().upper()
            self.agent_steps.append(f"🔄 Re-route check → {verdict}")
            return "REROUTE" in verdict
        except Exception:
            return False

    # ═════════════════════════════════════════════════════
    # RETRIEVAL PIPELINE
    # ═════════════════════════════════════════════════════
    def _retrieve_pipeline(self, question: str, selected_doc: str) -> Tuple[str, List[Document]]:
        if not self.vector_store:
            self.agent_steps.append("📄 No documents indexed")
            return "(No document context retrieved.)", []

        # 1. Build retriever (filtered or unfiltered)
        if selected_doc == "All Documents":
            filter_kwargs = {}
        else:
            filter_kwargs = {"filter": {"source": selected_doc}}

        retriever = self.vector_store.as_retriever(
            search_kwargs={"k": INITIAL_K, **filter_kwargs}
        )

        # 2. Multi-query expansion
        queries = self._generate_multi_queries(question)
        self.agent_steps.append(f"🔍 Multi-query retrieval ({len(queries)} queries)")

        # 3. Retrieve for each query
        all_results: List[List[Document]] = []
        for q in queries:
            try:
                docs = retriever.invoke(q)
                all_results.append(docs)
            except Exception as e:
                print(f"Retrieve error for '{q}': {e}")

        if not all_results:
            return "(No document context retrieved.)", []

        # 4. RRF fusion
        fused = self._reciprocal_rank_fusion(all_results)
        self.agent_steps.append(f"🔗 RRF fused → {len(fused)} unique candidates")

        # 5. Re-rank
        top_docs = self.rerank(question, fused[:INITIAL_K], top_k=RERANK_TOP_K)

        # 6. Sufficiency check
        context = self.format_context(top_docs)
        try:
            grade = self.context_check_chain.invoke({
                "context": context,
                "question": question,
            }).strip().upper()
            self.agent_steps.append(
                "✅ Context sufficient" if "YES" in grade else "⚠️ Context may be weak"
            )
        except Exception:
            pass

        return context, top_docs

    # ═════════════════════════════════════════════════════
    # MAIN ENTRY POINT
    # ═════════════════════════════════════════════════════
    def ask(
        self,
        question: str,
        selected_doc: str,
        current_history: str = "",
        cross_chat_history: str = "",
    ):
        self.agent_steps = []
        t_start = time.time()

        # ─── STEP 1: Initial routing ───
        self.agent_steps.append("🤖 Routing...")
        try:
            route = self.decision_chain.invoke({
                "question": question,
                "current_history": current_history or "(empty)",
                "cross_chat_history": cross_chat_history or "(empty)",
            }).strip().upper()
        except Exception:
            route = "DOCUMENT"

        if "HYBRID" in route:
            route = "HYBRID"
        elif "CHAT" in route:
            route = "CHAT"
        elif "GENERAL" in route:
            route = "GENERAL"
        else:
            route = "DOCUMENT"

        self.agent_steps.append(f"🤖 Route: {route}")

        # ─── STEP 2: GENERAL (no docs) ───
        if route == "GENERAL" and not self.vector_store:
            self.agent_steps.append("🧠 General knowledge path")
            answer = self.answer_chain.invoke({
                "context": "(No document context needed.)",
                "current_history": current_history or "(empty)",
                "cross_chat_history": cross_chat_history or "(empty)",
                "question": question,
            })
            self._log_done(t_start)
            return answer, []

        # ─── STEP 3: CHAT ───
        if route == "CHAT":
            self.agent_steps.append("💬 Chat-history path")
            answer = self.answer_chain.invoke({
                "context": "(Skipped — question is about conversation.)",
                "current_history": current_history or "(empty)",
                "cross_chat_history": cross_chat_history or "(empty)",
                "question": question,
            })

            if self.vector_store and self._should_reroute(question, "CHAT", answer):
                self.agent_steps.append("↪️ Fallback → documents")
                context, docs = self._retrieve_pipeline(question, selected_doc)
                answer = self.answer_chain.invoke({
                    "context": context,
                    "current_history": current_history or "(empty)",
                    "cross_chat_history": cross_chat_history or "(empty)",
                    "question": question,
                })
                self._log_done(t_start)
                return answer, docs

            self._log_done(t_start)
            return answer, []

        # ─── STEP 4: DOCUMENT / HYBRID ───
        context, docs = self._retrieve_pipeline(question, selected_doc)

        if self._is_map_reduce_question(question) and len(docs) >= 2:
            self.agent_steps.append("🧩 Map-reduce type question detected")
            answer = self.map_reduce_answer(question, docs)

            if route == "HYBRID":
                self.agent_steps.append("🔀 HYBRID merge with chat")
                answer = self.answer_chain.invoke({
                    "context": f"(Map-reduce result)\n{answer}",
                    "current_history": current_history or "(empty)",
                    "cross_chat_history": cross_chat_history or "(empty)",
                    "question": question,
                })
            self._log_done(t_start)
            return answer, docs

        self.agent_steps.append("✍️ Generating answer...")
        answer = self.answer_chain.invoke({
            "context": context,
            "current_history": current_history or "(empty)",
            "cross_chat_history": cross_chat_history or "(empty)",
            "question": question,
        })

        if route == "DOCUMENT" and self._should_reroute(question, "DOCUMENT", answer):
            self.agent_steps.append("↪️ Fallback → chat history")
            answer = self.answer_chain.invoke({
                "context": context,
                "current_history": current_history or "(empty)",
                "cross_chat_history": cross_chat_history or "(empty)",
                "question": question,
            })

        self._log_done(t_start)
        return answer, docs

    def _log_done(self, t_start: float):
        self.agent_steps.append(f"✅ Done in {time.time() - t_start:.2f}s")