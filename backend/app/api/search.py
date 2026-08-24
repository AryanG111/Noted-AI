from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import datetime

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.models.contact import Contact
from backend.app.models.task import Task
from backend.app.schemas.search import SearchQuery, SearchResponse, SearchResultItem
from backend.app.services.vector_db import vector_db
from backend.app.kernels import get_kernel
from backend.app.core.config import settings

# Langchain imports
from langchain_classic.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from backend.app.services.agent_tools import get_agent_tools

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=SearchResponse)
async def semantic_search(
    query: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate query embedding and fetch similar notes from ChromaDB, 
    with a conceptual explanation of why they match.
    """
    kernel = get_kernel()
    try:
        query_embedding = await kernel.generate_embeddings(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate query embedding: {e}"
        )
        
    chroma_results = vector_db.query_notes(
        user_id=current_user.id,
        query_embedding=query_embedding,
        limit=limit
    )
    
    results = []
    for item in chroma_results:
        # Fetch actual creation date from DB if possible
        note_id = item["note_id"]
        note = db.query(Note).filter(Note.id == note_id).first()
        created_at = note.created_at if note else datetime.datetime.now()
        
        # Build a helpful relevance explanation
        tags = item.get("tags")
        explanation = f"Matched concept"
        if tags:
            explanation += f" associated with tags: {tags}"
            
        results.append(SearchResultItem(
            id=item["note_id"],
            title=item.get("title"),
            content=item.get("content"),
            summary=item.get("summary"),
            tags=item.get("tags"),
            score=item.get("score", 0.0),
            relevance_explanation=explanation,
            created_at=created_at
        ))
        
    return SearchResponse(query=query, results=results)

@router.post("/chat")
async def ask_noted(
    query_in: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_active_kernel: Optional[str] = Header(None)
):
    """
    Ask Noted Q&A Chat endpoint: 
    Runs a Langchain ReAct agent using the user's active model selection to enable reasoning and DB actions.
    """
    query = query_in.query
    
    # Track accessed notes for citations
    accessed_notes = []
    
    # 1. Initialize DB tools
    tools = get_agent_tools(db, current_user.id, accessed_notes)
    
    # 2. Initialize LLM compatibility layer based on provider selection
    provider = (x_active_kernel or settings.ACTIVE_LLM_PROVIDER).lower()
    try:
        if provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured in your environment settings (.env).")
            llm = ChatOpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=settings.GEMINI_API_KEY,
                model="gemma-4-26b-a4b-it",
                temperature=0.0
            )
        elif provider == "groq":
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is not configured in your environment settings (.env).")
            llm = ChatOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY,
                model="gemma2-9b-it",
                temperature=0.0
            )
        else: # ollama
            llm = ChatOpenAI(
                base_url=f"{settings.OLLAMA_BASE_URL}/v1",
                api_key="ollama",
                model=settings.OLLAMA_MODEL,
                temperature=0.0
            )
    except Exception as e:
        return {
            "answer": f"LLM Initialization failure ({provider}): {e}",
            "citations": []
        }
        
    # 3. Create prompt template
    template = """You are Noted AI, the private, warm, intelligent cognitive assistant for the user.
Answer the user's question as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do. Always execute thoughts and actions step-by-step.
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question. Write your final answer in a {ai_tone} style.

Begin!

User's Background: {user_background}
Current local time is: {current_time} (Use this to resolve relative dates like 'tomorrow', 'next week', 'Friday').

Question: {input}
Thought:{agent_scratchpad}"""

    prompt = PromptTemplate.from_template(template)
    
    # 4. Construct Agent & Executor
    try:
        agent = create_react_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
        
        # 5. Run async
        response = await agent_executor.ainvoke({
            "input": query,
            "user_background": current_user.occupation or "Software Engineer",
            "ai_tone": current_user.ai_tone or "balanced",
            "current_time": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        })
        response_text = response.get("output", "Agent did not yield an output.")
    except Exception as e:
        print(f"Agent Execution error: {e}")
        response_text = f"An error occurred in the agent reasoning loop: {e}"
        
    return {
        "answer": response_text,
        "citations": accessed_notes
    }

@router.get("/proactive")
async def get_proactive_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scans pending tasks and contact interactions, formulating a friendly proactive nudge via LLM.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # 1. Fetch pending tasks that are older than 12 hours
    pending_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "pending"
    ).all()
    
    old_tasks = []
    for t in pending_tasks:
        # Check delta hours
        created = t.created_at
        if created:
            # handle timezone aware/naive mismatch
            if created.tzinfo is None:
                created = created.replace(tzinfo=datetime.timezone.utc)
            delta = now - created
            if delta.total_seconds() > 3600 * 12: # 12 hours
                old_tasks.append(f"Task: {t.description} (created {round(delta.total_seconds() / 3600)} hours ago)")
                
    # 2. Fetch contacts with stale interactions (older than 3 days)
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    stale_contacts = []
    for c in contacts:
        interact = c.last_interaction or c.created_at
        if interact:
            if interact.tzinfo is None:
                interact = interact.replace(tzinfo=datetime.timezone.utc)
            delta = now - interact
            if delta.days >= 3:
                stale_contacts.append(f"Contact: {c.name} ({c.role or 'Contact'}) - no interaction for {delta.days} days. Context: {c.context}")
                
    if not old_tasks and not stale_contacts:
        return {"reminder": None}
        
    # Ask LLM to generate a gentle suggestion
    kernel = get_kernel()
    prompt = f"""
    You are a thoughtful cognitive memory helper. Generate a single friendly, supportive, proactive reminder sentence (maximum 18 words) warning the user about a pending task or a contact they may have forgotten to follow up with.
    
    Pending context:
    {" | ".join(old_tasks)}
    {" | ".join(stale_contacts)}
    
    Reminder must start with "✦ " and be very brief.
    Example: "✦ You mentioned following up with Rahul about the proposal 3 days ago."
    """
    
    try:
        reminder = await kernel.generate_chat_completion([
            {"role": "system", "content": "You are a proactive memory assistant. Keep reminders under 18 words."},
            {"role": "user", "content": prompt}
        ], temperature=0.5)
        reminder_text = reminder.strip()
    except Exception:
        # Fallback
        if old_tasks:
            reminder_text = f"✦ Don't forget your task: {pending_tasks[0].description}"
        else:
            reminder_text = f"✦ Reconnect with {contacts[0].name} when you get a chance."
            
    return {"reminder": reminder_text}
import datetime # Import helper
