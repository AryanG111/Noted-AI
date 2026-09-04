import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  HelpCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Sparkles, 
  ArrowRight, 
  Search, 
  ExternalLink, 
  Layers, 
  Calendar, 
  X, 
  CheckCircle2, 
  Zap, 
  Share2,
  Filter
} from 'lucide-react';

export const Graph = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Core graph data
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected node & inspector
  const [selectedNode, setSelectedNode] = useState(null);
  const selectedNodeRef = useRef(null);
  selectedNodeRef.current = selectedNode;

  // Filter state
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'note' | 'contact' | 'task'
  const [searchQuery, setSearchQuery] = useState('');

  // Time-Travel Evolution Slider State
  const [timeRange, setTimeRange] = useState({ min: 0, max: 100, current: 100 });
  const [isPlayingEvolution, setIsPlayingEvolution] = useState(false);
  const evolutionTimerRef = useRef(null);

  // Pathfinding State
  const [pathfindingMode, setPathfindingMode] = useState(false);
  const [pathStart, setPathStart] = useState(null);
  const [pathTarget, setPathTarget] = useState(null);
  const [discoveredPath, setDiscoveredPath] = useState(null); // Array of node IDs in path

  // Canvas & Simulation references
  const canvasRef = useRef(null);
  const dragNodeRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const response = await fetch(`${API_URL}/timeline/graph`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        
        // Calculate timestamp numbers for time travel
        const nodeTimestamps = json.nodes
          .map(n => n.created_at ? new Date(n.created_at).getTime() : Date.now())
          .filter(t => !isNaN(t));

        const minTime = nodeTimestamps.length > 0 ? Math.min(...nodeTimestamps) : Date.now() - 7 * 24 * 3600 * 1000;
        const maxTime = nodeTimestamps.length > 0 ? Math.max(...nodeTimestamps) : Date.now();

        setTimeRange({
          min: minTime,
          max: maxTime === minTime ? maxTime + 1000 : maxTime,
          current: maxTime === minTime ? maxTime + 1000 : maxTime
        });

        // Initialize spatial layout positions
        const nodes = json.nodes.map((node, idx) => {
          const angle = (idx / Math.max(1, json.nodes.length)) * 2 * Math.PI;
          const dist = 140 + (idx % 3) * 60;
          return {
            ...node,
            x: 350 + Math.cos(angle) * dist,
            y: 300 + Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            radius: node.type === 'note' ? 22 : node.type === 'contact' ? 20 : 18,
            timestampNum: node.created_at ? new Date(node.created_at).getTime() : Date.now()
          };
        });
        
        setData({ nodes, edges: json.edges });
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `Failed to fetch knowledge graph (HTTP ${response.status})`);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Connection error to server");
    } finally {
      setLoading(false);
    }
  };

  // Filtered nodes based on Type, Search Query, and Time-Travel Slider
  const activeNodes = useMemo(() => {
    return data.nodes.filter(node => {
      // 1. Time-travel filter
      if (node.timestampNum && node.timestampNum > timeRange.current) {
        return false;
      }
      // 2. Type filter
      if (typeFilter !== 'all' && node.type !== typeFilter) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = node.label?.toLowerCase().includes(q);
        const matchCluster = node.cluster?.toLowerCase().includes(q);
        if (!matchLabel && !matchCluster) return false;
      }
      return true;
    });
  }, [data.nodes, typeFilter, searchQuery, timeRange.current]);

  // Active edges connecting currently visible nodes
  const activeEdges = useMemo(() => {
    const activeNodeIds = new Set(activeNodes.map(n => n.id));
    return data.edges.filter(edge => 
      activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target)
    );
  }, [data.edges, activeNodes]);

  // BFS Shortest Path Algorithm
  useEffect(() => {
    if (!pathfindingMode || !pathStart || !pathTarget) {
      setDiscoveredPath(null);
      return;
    }
    if (pathStart === pathTarget) {
      setDiscoveredPath([pathStart]);
      return;
    }

    // Build adjacency list
    const adj = {};
    activeNodes.forEach(n => { adj[n.id] = []; });
    activeEdges.forEach(e => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (adj[e.target]) adj[e.target].push(e.source);
    });

    const queue = [[pathStart]];
    const visited = new Set([pathStart]);
    let found = null;

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === pathTarget) {
        found = path;
        break;
      }

      const neighbors = adj[current] || [];
      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([...path, nxt]);
        }
      }
    }

    setDiscoveredPath(found);
  }, [pathfindingMode, pathStart, pathTarget, activeNodes, activeEdges]);

  // Time-Travel Evolution Player
  useEffect(() => {
    if (isPlayingEvolution) {
      evolutionTimerRef.current = setInterval(() => {
        setTimeRange(prev => {
          const step = (prev.max - prev.min) / 40;
          if (prev.current >= prev.max) {
            setIsPlayingEvolution(false);
            return { ...prev, current: prev.max };
          }
          return { ...prev, current: Math.min(prev.max, prev.current + step) };
        });
      }, 350);
    } else {
      if (evolutionTimerRef.current) clearInterval(evolutionTimerRef.current);
    }
    return () => {
      if (evolutionTimerRef.current) clearInterval(evolutionTimerRef.current);
    };
  }, [isPlayingEvolution]);

  // Simulation & Canvas Rendering Loop
  useEffect(() => {
    if (loading || activeNodes.length === 0 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const runSimulation = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }
      const width = canvas.width;
      const height = canvas.height;
      const nodes = activeNodes;
      const edges = activeEdges;

      // 1. Force Simulation Physics
      const kRepel = 2400;
      const kAttract = 0.045;
      const gravity = 0.012;
      const damping = 0.85;

      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 320) {
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (nodeA !== dragNodeRef.current) {
              nodeA.vx -= fx;
              nodeA.vy -= fy;
            }
            if (nodeB !== dragNodeRef.current) {
              nodeB.vx += fx;
              nodeB.vy += fy;
            }
          }
        }
      }

      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          
          const force = kAttract * (dist - 90);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          if (sourceNode !== dragNodeRef.current) {
            sourceNode.vx += fx;
            sourceNode.vy += fy;
          }
          if (targetNode !== dragNodeRef.current) {
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        }
      });

      // Position update & boundaries
      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;
        node.vx += (width / 2 - node.x) * gravity;
        node.vy += (height / 2 - node.y) * gravity;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;

        node.x = Math.max(node.radius + 20, Math.min(width - node.radius - 20, node.x));
        node.y = Math.max(node.radius + 20, Math.min(height - node.radius - 20, node.y));
      });

      // 2. Draw Background Grid
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.strokeStyle = '#F1EFEA';
      ctx.lineWidth = 0.5;
      const gridSize = 28;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Draw Semantic Cluster Halos (Aura)
      const clusters = {};
      nodes.forEach(n => {
        const cName = n.cluster || n.type;
        if (!clusters[cName]) clusters[cName] = [];
        clusters[cName].push(n);
      });

      Object.entries(clusters).forEach(([cName, cNodes]) => {
        if (cNodes.length >= 2) {
          let cx = 0, cy = 0;
          cNodes.forEach(n => { cx += n.x; cy += n.y; });
          cx /= cNodes.length;
          cy /= cNodes.length;

          let maxDist = 40;
          cNodes.forEach(n => {
            const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2);
            if (d > maxDist) maxDist = d;
          });

          // Soft Glowing Aura
          ctx.save();
          const haloGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxDist + 45);
          if (cName.includes('People') || cNodes[0].type === 'contact') {
            haloGrad.addColorStop(0, 'rgba(2, 132, 199, 0.08)');
            haloGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
          } else if (cName.includes('Action') || cNodes[0].type === 'task') {
            haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
            haloGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
          } else {
            haloGrad.addColorStop(0, 'rgba(109, 93, 252, 0.08)');
            haloGrad.addColorStop(1, 'rgba(109, 93, 252, 0)');
          }

          ctx.beginPath();
          ctx.arc(cx, cy, maxDist + 45, 0, 2 * Math.PI);
          ctx.fillStyle = haloGrad;
          ctx.fill();
          ctx.restore();
        }
      });

      // 4. Draw Edges
      const pathSet = discoveredPath ? new Set(discoveredPath) : null;

      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const isPathEdge = pathSet && pathSet.has(edge.source) && pathSet.has(edge.target);
          
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);

          if (isPathEdge) {
            ctx.strokeStyle = '#F59E0B'; // Glowing Gold for Shortest Path
            ctx.lineWidth = 3.5;
            ctx.stroke();
          } else {
            ctx.strokeStyle = pathSet ? 'rgba(209, 208, 202, 0.35)' : '#D1D0CA';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      });

      // 5. Draw Nodes
      nodes.forEach(node => {
        const isSel = selectedNodeRef.current && node.id === selectedNodeRef.current.id;
        const isHovered = hoveredNodeRef.current && node.id === hoveredNodeRef.current.id;
        const isPathNode = pathSet && pathSet.has(node.id);
        const isDimmed = pathSet && !isPathNode;

        ctx.save();
        if (isDimmed) ctx.globalAlpha = 0.25;

        // Path / Selection Halo
        if (isPathNode || isSel || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isPathNode ? 10 : 7), 0, 2 * Math.PI);
          ctx.strokeStyle = isPathNode ? 'rgba(245, 158, 11, 0.45)' : isSel ? 'rgba(109, 93, 252, 0.35)' : 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Color coding
        let fillStyle = '#F5F3FF';
        let strokeStyle = '#6D5DFC';
        let emoji = '📝';
        
        if (node.type === 'contact') {
          fillStyle = '#F0F9FF';
          strokeStyle = '#0284C7';
          emoji = '👤';
        } else if (node.type === 'task') {
          fillStyle = '#ECFDF5';
          strokeStyle = '#10B981';
          emoji = '✅';
        }

        // Node Background Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        
        // Sketch border
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = isPathNode ? 2.5 : 1.5;
        ctx.stroke();

        // Node Icon/Emoji
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, node.x, node.y + 0.5);

        // Node Label Pill
        const labelText = node.label || 'Untitled';
        const displayLabel = labelText.length > 20 ? labelText.slice(0, 18) + '...' : labelText;
        ctx.font = '500 11px Inter, sans-serif';
        const textWidth = ctx.measureText(displayLabel).width;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'var(--border-color)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(node.x - textWidth / 2 - 5, node.y + node.radius + 3, textWidth + 10, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1C1917';
        ctx.fillText(displayLabel, node.x, node.y + node.radius + 11);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(runSimulation);
    };

    runSimulation();
    return () => cancelAnimationFrame(animationFrameId);
  }, [loading, activeNodes, activeEdges, discoveredPath]);

  // Mouse drag & selection
  const getNodeAtPos = (x, y) => {
    for (let i = activeNodes.length - 1; i >= 0; i--) {
      const node = activeNodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= (node.radius + 8) * (node.radius + 8)) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = getNodeAtPos(x, y);
    if (clicked) {
      if (pathfindingMode) {
        if (!pathStart) {
          setPathStart(clicked.id);
        } else if (!pathTarget && clicked.id !== pathStart) {
          setPathTarget(clicked.id);
        } else {
          setPathStart(clicked.id);
          setPathTarget(null);
        }
      }
      setSelectedNode(clicked);
      dragNodeRef.current = clicked;
      offsetRef.current = { x: clicked.x - x, y: clicked.y - y };
    } else {
      if (!pathfindingMode) setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    hoveredNodeRef.current = getNodeAtPos(x, y);

    if (dragNodeRef.current) {
      dragNodeRef.current.x = x + offsetRef.current.x;
      dragNodeRef.current.y = y + offsetRef.current.y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
    }
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  const getConnections = (nodeId = selectedNode?.id) => {
    if (!nodeId) return [];
    const connectedIds = new Set();
    data.edges.forEach(e => {
      if (e.source === nodeId) connectedIds.add(e.target);
      if (e.target === nodeId) connectedIds.add(e.source);
    });
    return data.nodes.filter(n => connectedIds.has(n.id));
  };

  const formatScrubberDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      
      {/* 1. Header & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple-accent)' }}>
              Memory Graph 2.0
            </span>
            <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--warm-bg)', border: '1px solid var(--border-color)', padding: '0.1rem 0.45rem', borderRadius: '100px', color: 'var(--text-secondary)' }}>
              {activeNodes.length} active nodes • {activeEdges.length} connections
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            Living Knowledge Graph
          </h1>
        </div>

        {/* Filter Pills & Pathfinding Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Type Filter */}
          <div style={{ display: 'flex', backgroundColor: 'var(--warm-bg)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            {['all', 'note', 'contact', 'task'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  background: typeFilter === type ? '#FFFFFF' : 'none',
                  color: typeFilter === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === type ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: typeFilter === type ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  textTransform: 'capitalize'
                }}
              >
                {type === 'all' ? 'All' : type === 'note' ? 'Notes 📝' : type === 'contact' ? 'People 👤' : 'Tasks ✅'}
              </button>
            ))}
          </div>

          {/* Pathfinding Toggle */}
          <button
            onClick={() => {
              setPathfindingMode(!pathfindingMode);
              setPathStart(null);
              setPathTarget(null);
              setDiscoveredPath(null);
            }}
            style={{
              backgroundColor: pathfindingMode ? '#FEF3C7' : '#FFFFFF',
              color: pathfindingMode ? '#B45309' : 'var(--text-primary)',
              border: `1px solid ${pathfindingMode ? '#FCD34D' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Zap size={13} style={{ color: pathfindingMode ? '#B45309' : '#F59E0B' }} />
            <span>{pathfindingMode ? 'Exit Pathfinding' : 'Find Path'}</span>
          </button>
        </div>
      </div>

      {/* Pathfinding Banner Bar */}
      {pathfindingMode && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#92400E'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>Pathfinding Mode:</span>
            <span>
              {!pathStart 
                ? 'Click Origin Node 📍' 
                : !pathTarget 
                  ? `Origin: ${data.nodes.find(n => n.id === pathStart)?.label} ➔ Click Target Node 🎯`
                  : discoveredPath 
                    ? `Path found in ${discoveredPath.length - 1} steps!` 
                    : 'No direct connection path found.'}
            </span>
          </div>
          {(pathStart || pathTarget) && (
            <button
              onClick={() => { setPathStart(null); setPathTarget(null); setDiscoveredPath(null); }}
              style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
            >
              Reset Points
            </button>
          )}
        </div>
      )}

      {/* Main Canvas Area + Inspector Drawer */}
      <div style={{ display: 'flex', flexGrow: 1, gap: '1.25rem', position: 'relative', minHeight: '520px' }}>
        
        {/* Canvas Frame */}
        <div style={{
          flexGrow: 1,
          position: 'relative',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#FAF9F6',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <canvas
            ref={canvasRef}
            width={850}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: dragNodeRef.current ? 'grabbing' : 'grab'
            }}
          />

          {/* Graph Search Overlay */}
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes or clusters..."
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '100px',
                  padding: '0.4rem 0.75rem 0.4rem 2rem',
                  fontSize: '0.75rem',
                  outline: 'none',
                  width: '210px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Node Glassmorphic Inspector Drawer */}
        {selectedNode && (
          <div style={{
            width: '320px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 600, 
                  letterSpacing: '0.06em', 
                  color: selectedNode.type === 'note' ? 'var(--purple-accent)' : selectedNode.type === 'contact' ? '#0284C7' : '#10B981',
                  textTransform: 'uppercase'
                }}>
                  {selectedNode.type} • {selectedNode.cluster || 'Entity'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
                  {selectedNode.label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Snippet / Description */}
            <div style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.45',
              backgroundColor: 'var(--warm-bg)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              {selectedNode.summary || selectedNode.context || selectedNode.description || 'No detailed preview available.'}
            </div>

            {/* Quick Action Navigation Button */}
            <button
              onClick={() => {
                if (selectedNode.type === 'note') {
                  navigate('/notes', { state: { selectedNoteId: selectedNode.id } });
                } else if (selectedNode.type === 'contact') {
                  navigate('/contacts');
                } else {
                  navigate('/tasks');
                }
              }}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Open in {selectedNode.type === 'note' ? 'Notes Editor' : selectedNode.type === 'contact' ? 'Contacts' : 'Tasks'} <ExternalLink size={13} />
            </button>

            {/* Connected Neighbors List */}
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                Direct Connections ({getConnections().length})
              </span>
              {getConnections().length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No connections detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {getConnections().map(conn => (
                    <div
                      key={conn.id}
                      onClick={() => setSelectedNode(conn)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--warm-bg)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'var(--transition)'
                      }}
                      className="note-mention-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: conn.type === 'note' ? 'var(--purple-accent)' : conn.type === 'contact' ? '#0284C7' : '#10B981',
                          flexShrink: 0
                        }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conn.label}
                        </span>
                      </div>
                      <ArrowRight size={11} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Time-Travel Evolution Scrubber Bar */}
      <div style={{
        marginTop: '1.25rem',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#FFFFFF',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap'
      }}>
        {/* Play/Pause Button */}
        <button
          onClick={() => {
            if (timeRange.current >= timeRange.max) {
              setTimeRange(prev => ({ ...prev, current: prev.min }));
            }
            setIsPlayingEvolution(!isPlayingEvolution);
          }}
          style={{
            backgroundColor: isPlayingEvolution ? '#FEE2E2' : 'var(--warm-bg)',
            color: isPlayingEvolution ? 'var(--red-accent)' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '100px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          {isPlayingEvolution ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlayingEvolution ? 'Pause' : 'Play Evolution'}</span>
        </button>

        {/* Timeline Range Scrubber */}
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {formatScrubberDate(timeRange.min)}
          </span>

          <input
            type="range"
            min={timeRange.min}
            max={timeRange.max}
            value={timeRange.current}
            onChange={(e) => {
              setIsPlayingEvolution(false);
              setTimeRange(prev => ({ ...prev, current: Number(e.target.value) }));
            }}
            style={{
              flexGrow: 1,
              accentColor: 'var(--purple-accent)',
              cursor: 'pointer'
            }}
          />

          <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: 'var(--warm-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            {formatScrubberDate(timeRange.current)}
          </span>
        </div>

        {/* Reset to Today Button */}
        <button
          onClick={() => {
            setIsPlayingEvolution(false);
            setTimeRange(prev => ({ ...prev, current: prev.max }));
          }}
          title="Reset to Present Day"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem'
          }}
        >
          <RotateCcw size={12} />
          <span>Present</span>
        </button>
      </div>

    </div>
  );
};
