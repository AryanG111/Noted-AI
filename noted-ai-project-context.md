# Noted AI — Project Intent & Technical Specification

> **Purpose of this document:** This file is the canonical project context for any coding/AI development tool working on Noted AI. Preserve the product intent, scope, terminology, requirements, architecture, and technology choices described below. Do not reinterpret the project as a generic notes app or a simple chatbot/RAG wrapper.

## Coding-Agent Instructions

- Treat this document as the source of truth for the project's current intent and MVP scope.
- Do not silently add major product capabilities that are marked Out of Scope or Stretch Goals.
- Preserve the distinction between **structured memory in PostgreSQL** and **semantic/vector memory in ChromaDB**.
- Preserve the orchestration pipeline: **Summarizer → Entity Extractor → Task Extractor → Calendar Extractor → Embedding Generator → Relationship Builder → Storage**.
- The system must be designed around persistent memory, cross-entity retrieval, and orchestration—not merely CRUD notes or a thin LLM chat interface.
- LLM providers must remain swappable between **local Ollama** and **OpenAI API** through configuration.
- Extraction failures must not prevent note persistence; retries/fallbacks are part of the intended reliability model.
- Respect workspace/user isolation and avoid cross-user data leakage.
- Where implementation details are not specified in this document, do not assume a product decision has already been made. Flag the decision or choose a minimal implementation consistent with the stated requirements.

---



**Noted AI.**
*An AI-Powered Cognitive Workspace with Long-Term Memory*
Project Charter: Scope, User Requirements & Technical Specification

Name: Aryan Ghait	Roll No: 2501059
Document Version 1.0
Prepared: July 2026

# 1. Project Title & Project Scope

## 1.1 Project Title

Noted AI an AI-powered personal and team workspace that remembers, organizes, connects, and proactively surfaces information, rather than passively storing it.

## 1.2 Problem Statement

Conventional note-taking tools are passive containers. Users write information down and it effectively disappears; there is no mechanism for the tool to recall, connect, or act on it later. As a result, users routinely struggle to:

- Remember commitments they made to themselves or others.
- Find decisions or context buried in old notes.
- Track the history of a client or contact relationship.
- Link related ideas that were captured at different times.
- Follow up on tasks that were mentioned but never formally tracked.

Noted AI addresses this by treating every note as a piece of structured, embedded memory inside a knowledge graph, enabling recall, reasoning, and proactive follow-up over time, not just storage and keyword search.

## 1.3 Product Vision

Noted AI is positioned as the operational memory for founders, freelancers, students, and small teams: a single workspace where notes, tasks, contacts, and decisions are automatically organized, cross-linked, and retrievable through natural language, with the system proactively reminding users of what they may be forgetting.

## 1.4 Project Scope

The scope below is calibrated for a focused, buildable MVP that still demonstrates full-stack AI system architecture.
**In Scope**

- Smart Notes: rich text and Markdown note creation with AI-generated summaries, titles, and tags.
- Memory Timeline: chronological, AI-annotated view of notes and events that resurfaces relevant past context.
- Contact Memory: structured, evolving profiles of people built from unstructured note mentions.
- Knowledge Retrieval: natural-language search over the full note history using semantic (vector) search.
- Action Extraction: automatic detection of tasks, commitments, and dates from free-text notes.
- Semantic Search: concept-based search that goes beyond exact keyword matches.
- Memory Links: an Obsidian-style graph connecting notes, people, tasks, and events.
- Core orchestration pipeline: Summarizer → Entity Extractor → Task Extractor → Calendar Extractor → Embedding Generator → Relationship Builder → Storage.

**Out of Scope (MVP)**

- Native mobile applications (web-responsive only for MVP).
- Multi-workspace / enterprise team permissions.
- Third-party calendar and email two-way sync (may be considered post-MVP).
- Voice note transcription.

**Stretch Goals**

- Memory Importance Scoring: the AI assigns each memory an importance score (e.g., "bought milk" = 1, "investor meeting" = 10) and prioritizes high-importance memories during retrieval.
- Typed Memories: distinct memory types (Idea, Meeting, Task, Contact, Decision, Research, Reminder, Expense) sharing one UI but with type-specific extraction logic.
- Proactive Agent: the system independently notices unresolved commitments — e.g., surfacing "You mentioned following up with Acme Corp three weeks ago and there has been no update since — create a reminder?" — turning the app from a reactive Q&A tool into a reasoning system that monitors time and follow-through.

## 1.5 System Architecture Overview

The core differentiator of Noted AI is architectural, not conversational. Rather than functioning as a simple chatbot wrapper, the system implements a full memory pipeline:
**User Input → Notes → Embeddings → Vector Database → Memory Layer → Planner/Orchestrator → LLM → Response**
This pipeline allows the system to combine multiple memory sources (notes, tasks, timeline events, and contact history) into a single, context-aware answer — for example, resolving a query like "What's pending with XYZ?" by synthesizing notes, tasks, timeline entries, and contact records in one response.

# 2. User Requirements Module

## 2.1 Target Users

| **User TypePrimary Need** |                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Founders                  | Track investor conversations, decisions, and follow-ups without losing context.        |
| Freelancers               | Maintain client history, proposals, and commitments across multiple projects.          |
| Students                  | Connect research notes, ideas, and reading material into a retrievable knowledge base. |
| Small Teams               | Share an operational memory of meetings, tasks, and decisions.                         |

## 2.2 User Stories

1. As a user, I want to write a free-text note so that the system can automatically generate a title, summary, and tags without manual effort.
2. As a user, I want the system to extract action items (e.g., "Call Rahul tomorrow") from my notes automatically, so I don't need to create separate to-do entries.
3. As a user, I want to build a memory profile of a contact over multiple interactions, so I can recall context like "met at Pune meetup, runs a startup, needs a proposal" instead of just a phone number.
4. As a user, I want to ask natural-language questions like "What did John tell me last month?" and get an accurate, synthesized answer.
5. As a user, I want to search by meaning (e.g., "show me everything related to deployment") rather than being limited to exact keyword matches.
6. As a user, I want to see related notes, people, and tasks linked together visually, so I can trace how a deal or idea evolved.
7. As a user, I want the system to proactively remind me of commitments that appear to be unresolved after a period of time.
8. As a user, I want to ask cross-entity questions such as "What's pending with XYZ?" and receive an answer combining notes, tasks, timeline, and contact data.

## 2.3 Functional Requirements

| **IDRequirementPriority** |                                                                                                                   |        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| FR-1                      | System shall allow creation, editing, and deletion of rich-text/Markdown notes.                                   | Must   |
| FR-2                      | System shall auto-generate a title, summary, and tags for each note using an LLM.                                 | Must   |
| FR-3                      | System shall extract structured entities (people, dates, tasks, amounts) from note text.                          | Must   |
| FR-4                      | System shall generate vector embeddings for each note and store them in a vector database.                        | Must   |
| FR-5                      | System shall support semantic search returning conceptually relevant notes, not just keyword matches.             | Must   |
| FR-6                      | System shall maintain a chronological Memory Timeline of notes and extracted events.                              | Must   |
| FR-7                      | System shall build and update Contact Memory profiles from mentions across multiple notes.                        | Must   |
| FR-8                      | System shall extract and track action items with status (pending/done) and due dates.                             | Must   |
| FR-9                      | System shall construct a relationship graph linking notes, contacts, tasks, and events.                           | Should |
| FR-10                     | System shall answer natural-language queries by combining data across notes, tasks, timeline, and contacts.       | Should |
| FR-11                     | System shall assign an importance score to memories and weight retrieval accordingly.                             | Could  |
| FR-12                     | System shall proactively surface unresolved commitments after a configurable time threshold.                      | Could  |
| FR-13                     | System shall support distinct memory types (Idea, Meeting, Task, Contact, Decision, Research, Reminder, Expense). | Could  |

## 2.4 Non-Functional Requirements

| **CategoryRequirement** |                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Performance             | Semantic search queries should return results within 2 seconds for a workspace of up to 10,000 notes.                               |
| Scalability             | Backend and vector store should support incremental growth without re-architecture for MVP-scale usage (single user to small team). |
| Usability               | Note capture should require minimal structure — users type freely; the system infers structure.                                     |
| Data Privacy            | User notes and embeddings must be isolated per user/workspace; no cross-user data leakage.                                          |
| Reliability             | Extraction pipeline failures (e.g., LLM timeout) must not block note saving; retries/fallbacks required.                            |
| Portability             | LLM backend should be swappable between local (Ollama) and hosted (OpenAI) providers via configuration.                             |

# 3. Technology Specification

## 3.1 Technology Stack Summary

| **LayerTechnologyPurpose** |                                   |                                                                          |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Frontend                   | React                             | Note editor, timeline view, search UI, knowledge graph visualization.    |
| Backend                    | FastAPI (Python)                  | REST API layer, orchestration of extraction pipeline, business logic.    |
| Primary Database           | PostgreSQL                        | Structured storage for notes, contacts, tasks, users, and relationships. |
| Vector Database            | ChromaDB                          | Storage and similarity search over note/text embeddings.                 |
| LLM                        | Ollama (local) or OpenAI API      | Summarization, tagging, entity/task extraction, question answering.      |
| Embedding Models           | BGE-Small, Nomic Embed, or MiniLM | Convert note text into vector representations for semantic search.       |

## 3.2 System Architecture & Data Flow

The processing pipeline for every new note follows a fixed orchestration sequence:

9. Summarizer — condenses the raw note into a short summary and title.
10. Entity Extractor — identifies people, organizations, and key concepts mentioned.
11. Task Extractor — detects action items and commitments.
12. Calendar Extractor — resolves relative and absolute dates/times (e.g., "Friday", "next week").
13. Embedding Generator — produces a vector representation of the note content.
14. Relationship Builder — links the note to existing contacts, tasks, and related notes in the graph.
15. Storage — persists structured data to PostgreSQL and vectors to ChromaDB.

At query time, the Planner/Orchestrator layer decomposes a user's natural-language question, retrieves relevant data from PostgreSQL (structured) and ChromaDB (semantic), and passes the combined context to the LLM to produce a synthesized response.

## 3.3 Component Responsibilities

| **ComponentResponsibility** |                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| React Frontend              | Note capture UI, Markdown rendering, timeline and graph views, chat-style query interface.                                |
| FastAPI Backend             | Exposes REST endpoints; coordinates the extraction pipeline; manages auth and workspace isolation.                        |
| PostgreSQL                  | Source of truth for notes, tasks, contacts, memory types, and relationship edges.                                         |
| ChromaDB                    | Stores note embeddings; performs nearest-neighbor similarity search for semantic queries.                                 |
| LLM Layer                   | Performs summarization, extraction, and final answer synthesis; abstracted so Ollama or OpenAI can be swapped via config. |
| Embedding Service           | Generates vector representations using BGE-Small, Nomic Embed, or MiniLM depending on deployment (local vs. hosted).      |

## 3.4 Deployment Considerations

- Local-first option: Ollama + local embedding model allows the MVP to run entirely offline for privacy-sensitive users.
- Hosted option: OpenAI API can be swapped in via configuration for higher-quality extraction/summarization at the cost of external API dependency.
- PostgreSQL and ChromaDB can be containerized (Docker) for consistent local development and future cloud deployment.

## 3.5 Key Differentiator

The system is explicitly not a CRUD notes app or a thin ChatGPT wrapper. Its value lies in the orchestrated pipeline embeddings, vector retrieval, a persistent memory layer, and a planning layer that reasons over time  culminating in the stretch capability of a proactive agent that surfaces forgotten commitments without being asked.