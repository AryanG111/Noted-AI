# Noted AI

*An AI-Powered Cognitive Workspace with Long-Term Memory*

## Overview

Noted AI is an AI-powered personal and team workspace that remembers, organizes, connects, and proactively surfaces information, rather than passively storing it. Conventional note-taking tools are passive containers where information is written down and effectively disappears. Noted AI addresses this by treating every note as a piece of structured, embedded memory inside a knowledge graph, enabling recall, reasoning, and proactive follow-up over time.

## Key Features

- **Smart Notes**: Rich text and Markdown note creation with AI-generated summaries, titles, and tags.
- **Memory Timeline**: Chronological, AI-annotated view of notes and events that resurfaces relevant past context.
- **Contact Memory**: Structured, evolving profiles of people built from unstructured note mentions.
- **Knowledge Retrieval**: Natural-language search over the full note history using semantic (vector) search.
- **Action Extraction**: Automatic detection of tasks, commitments, and dates from free-text notes.
- **Semantic Search**: Concept-based search that goes beyond exact keyword matches.
- **Memory Links**: An Obsidian-style graph connecting notes, people, tasks, and events.
- **Core Orchestration Pipeline**: Summarizer → Entity Extractor → Task Extractor → Calendar Extractor → Embedding Generator → Relationship Builder → Storage.

## Architecture

The core differentiator of Noted AI is its full memory pipeline:
**User Input → Notes → Embeddings → Vector Database → Memory Layer → Planner/Orchestrator → LLM → Response**

### Technology Stack

- **Frontend**: React (Note editor, timeline view, search UI, knowledge graph visualization)
- **Backend**: FastAPI (Python) (REST API layer, orchestration, business logic)
- **Primary Database**: PostgreSQL (Structured storage for notes, contacts, tasks, users, relationships)
- **Vector Database**: ChromaDB (Storage and similarity search over note embeddings)
- **LLM**: Ollama (local) or OpenAI API (Summarization, extraction, question answering)
- **Embedding Models**: BGE-Small, Nomic Embed, or MiniLM (Vector representation generation)

## Getting Started

*(Instructions for setting up the project locally will be added here)*

## Project Structure

- `frontend/` - React application
- `backend/` - FastAPI backend application
- `chroma_db/` - Vector database storage
- `architecture-and-phases.md` - detailed architecture and development phases
- `noted-ai-design-documentation.md` - design documentation
- `noted-ai-project-context.md` - detailed project context and scope

## Documentation

For a deep dive into the project's intent, scope, and technical specifications, please refer to the `noted-ai-project-context.md` document. This serves as the canonical source of truth for the project.
