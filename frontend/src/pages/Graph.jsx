import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  Search, 
  ExternalLink, 
  X, 
  Zap, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  RefreshCw
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
  const [discoveredPath, setDiscoveredPath] = useState(null);

  // Canvas, Transform & Interaction References
  const canvasRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const dragNodeRef = useRef(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const nodeOffsetRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef(null);
  const isInitializedRef = useRef(false);

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

        // Initialize positions centered gracefully at 100% scale
        const total = Math.max(1, json.nodes.length);
        const nodes = json.nodes.map((node, idx) => {
          const ring = idx % 2;
          const ringRadius = 150 + ring * 90;
          const angle = (idx / total) * 2 * Math.PI + (ring * 0.5);
          
          return {
            ...node,
            x: 480 + Math.cos(angle) * ringRadius,
            y: 300 + Math.sin(angle) * ringRadius,
            vx: 0,
            vy: 0,
            radius: node.type === 'note' ? 24 : node.type === 'contact' ? 22 : 20,
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

  // Center Graph with 100% scale default
  const handleFitView = useCallback(() => {
    if (!canvasRef.current || activeNodes.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    activeNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const padding = 80;
    const graphW = Math.max(100, maxX - minX + padding * 2);
    const graphH = Math.max(100, maxY - minY + padding * 2);

    // Keep natural 100% scale if possible, only slightly scaling if needed
    const autoScale = Math.min(width / graphW, height / graphH);
    const scale = Math.min(1.15, Math.max(0.85, autoScale));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    transformRef.current = {
      k: scale,
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale
    };
    setZoomLevel(scale);
  }, [activeNodes]);

  // Reset Center & Layout
  const handleRelayout = () => {
    if (!canvasRef.current || activeNodes.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 550;
    const total = activeNodes.length;

    activeNodes.forEach((node, idx) => {
      const ring = idx % 2;
      const r = 160 + ring * 90;
      const angle = (idx / total) * 2 * Math.PI + (ring * 0.4);
      node.x = width / 2 + Math.cos(angle) * r;
      node.y = height / 2 + Math.sin(angle) * r;
      node.vx = 0;
      node.vy = 0;
    });

    transformRef.current = { x: 0, y: 0, k: 1 };
    setZoomLevel(1);
  };

  // Zoom Helpers
  const handleZoom = (delta) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerScreen = { x: width / 2, y: height / 2 };

    const oldK = transformRef.current.k;
    const newK = Math.min(2.5, Math.max(0.5, oldK * (1 + delta)));

    const wx = (centerScreen.x - transformRef.current.x) / oldK;
    const wy = (centerScreen.y - transformRef.current.y) / oldK;

    transformRef.current.k = newK;
    transformRef.current.x = centerScreen.x - wx * newK;
    transformRef.current.y = centerScreen.y - wy * newK;
    setZoomLevel(newK);
  };

  // Simulation & High-DPI (Retina) Canvas Rendering Loop
  useEffect(() => {
    if (loading || activeNodes.length === 0 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    if (!isInitializedRef.current && canvas.clientWidth > 0) {
      isInitializedRef.current = true;
      handleFitView();
    }

    const runSimulation = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      // High-DPI Canvas Resolution Buffer
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      const nodes = activeNodes;
      const edges = activeEdges;

      // 1. Force Simulation Physics (Spacious, Anti-Colliding)
      const kRepel = 24000;
      const kAttract = 0.02;
      const targetLinkDist = 180;
      const gravity = 0.0005;
      const damping = 0.82;

      // Repulsion between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 480) {
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

          // HARD COLLISION BUFFER (125px minimum spacing prevents overlapping labels)
          const minSeparation = 125;
          if (dist < minSeparation) {
            const overlap = (minSeparation - dist) * 0.45;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            if (nodeA !== dragNodeRef.current) {
              nodeA.x -= nx * overlap;
              nodeA.y -= ny * overlap;
            }
            if (nodeB !== dragNodeRef.current) {
              nodeB.x += nx * overlap;
              nodeB.y += ny * overlap;
            }
          }
        }
      }

      // Spring attraction between connected edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          
          const force = kAttract * (dist - targetLinkDist);
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

      // Position update & gentle centering
      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;
        node.vx += (displayWidth / 2 - node.x) * gravity;
        node.vy += (displayHeight / 2 - node.y) * gravity;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;
      });

      // 2. High-DPI Context Reset & Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr); // Scale for crystal clear rendering on all Retina/4K displays

      // Background Subtle Dot Grid
      const t = transformRef.current;
      ctx.save();
      ctx.fillStyle = '#E5E4DE';
      const gridSize = 32 * t.k;
      const startX = (t.x % gridSize);
      const startY = (t.y % gridSize);

      for (let x = startX; x < displayWidth; x += gridSize) {
        for (let y = startY; y < displayHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      ctx.restore();

      // Apply Zoom & Pan World Transformation
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

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

          let maxDist = 45;
          cNodes.forEach(n => {
            const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2);
            if (d > maxDist) maxDist = d;
          });

          // Soft Glowing Cluster Aura
          ctx.save();
          const haloGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxDist + 55);
          if (cName.includes('People') || cNodes[0].type === 'contact') {
            haloGrad.addColorStop(0, 'rgba(2, 132, 199, 0.09)');
            haloGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
          } else if (cName.includes('Action') || cNodes[0].type === 'task') {
            haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.09)');
            haloGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
          } else {
            haloGrad.addColorStop(0, 'rgba(109, 93, 252, 0.09)');
            haloGrad.addColorStop(1, 'rgba(109, 93, 252, 0)');
          }

          ctx.beginPath();
          ctx.arc(cx, cy, maxDist + 55, 0, 2 * Math.PI);
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
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 3.5 / Math.sqrt(t.k);
            ctx.stroke();
          } else {
            ctx.strokeStyle = pathSet ? 'rgba(209, 208, 202, 0.35)' : '#D1D0CA';
            ctx.lineWidth = 1.4 / Math.sqrt(t.k);
            ctx.stroke();
          }
        }
      });

      // 5. Draw Nodes & Crisp Badges
      nodes.forEach(node => {
        const isSel = selectedNodeRef.current && node.id === selectedNodeRef.current.id;
        const isHovered = hoveredNodeRef.current && node.id === hoveredNodeRef.current.id;
        const isPathNode = pathSet && pathSet.has(node.id);
        const isDimmed = pathSet && !isPathNode;

        ctx.save();
        if (isDimmed) ctx.globalAlpha = 0.22;

        // Path / Selection Ring
        if (isPathNode || isSel || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isPathNode ? 10 : 7), 0, 2 * Math.PI);
          ctx.strokeStyle = isPathNode 
            ? 'rgba(245, 158, 11, 0.55)' 
            : isSel 
              ? 'rgba(109, 93, 252, 0.45)' 
              : 'rgba(0,0,0,0.12)';
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }

        // Distinct Type Theme
        let fillStyle = '#F5F3FF';
        let strokeStyle = '#6D5DFC';
        let badgeBorder = '#DDD6FE';
        let emoji = '📝';
        
        if (node.type === 'contact') {
          fillStyle = '#F0F9FF';
          strokeStyle = '#0284C7';
          badgeBorder = '#BAE6FD';
          emoji = '👤';
        } else if (node.type === 'task') {
          fillStyle = '#ECFDF5';
          strokeStyle = '#10B981';
          badgeBorder = '#A7F3D0';
          emoji = '✅';
        }

        // Node Circle Body with soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();
        
        // Node Ring Border
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = isPathNode ? 2.5 : 2.0;
        ctx.stroke();

        // Node Icon/Emoji
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, node.x, node.y + 0.5);

        // Crisp Node Label Pill
        const labelText = node.label || 'Untitled';
        const displayLabel = labelText.length > 22 ? labelText.slice(0, 20) + '...' : labelText;
        ctx.font = '600 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        const textWidth = ctx.measureText(displayLabel).width;
        
        const pillW = textWidth + 16;
        const pillH = 19;
        const pillX = node.x - pillW / 2;
        const pillY = node.y + node.radius + 4;

        // Pill shadow & background
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.06)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Pill text
        ctx.fillStyle = '#1C1917';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayLabel, node.x, pillY + pillH / 2);

        ctx.restore();
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(runSimulation);
    };

    runSimulation();
    return () => cancelAnimationFrame(animationFrameId);
  }, [loading, activeNodes, activeEdges, discoveredPath, handleFitView]);

  // World coordinates converter
  const screenToWorld = (screenX, screenY) => {
    const t = transformRef.current;
    return {
      x: (screenX - t.x) / t.k,
      y: (screenY - t.y) / t.k
    };
  };

  // Find node at world coordinate pos
  const getNodeAtPos = (worldX, worldY) => {
    for (let i = activeNodes.length - 1; i >= 0; i--) {
      const node = activeNodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= (node.radius + 16) * (node.radius + 16)) {
        return node;
      }
    }
    return null;
  };

  // Canvas Mouse Interactions
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    const clickedNode = getNodeAtPos(worldPos.x, worldPos.y);
    if (clickedNode) {
      if (pathfindingMode) {
        if (!pathStart) {
          setPathStart(clickedNode.id);
        } else if (!pathTarget && clickedNode.id !== pathStart) {
          setPathTarget(clickedNode.id);
        } else {
          setPathStart(clickedNode.id);
          setPathTarget(null);
        }
      }
      setSelectedNode(clickedNode);
      dragNodeRef.current = clickedNode;
      nodeOffsetRef.current = { x: clickedNode.x - worldPos.x, y: clickedNode.y - worldPos.y };
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: screenX - transformRef.current.x,
        y: screenY - transformRef.current.y
      };
      if (!pathfindingMode) setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    hoveredNodeRef.current = getNodeAtPos(worldPos.x, worldPos.y);

    if (dragNodeRef.current) {
      dragNodeRef.current.x = worldPos.x + nodeOffsetRef.current.x;
      dragNodeRef.current.y = worldPos.y + nodeOffsetRef.current.y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
    } else if (isPanningRef.current) {
      transformRef.current.x = screenX - panStartRef.current.x;
      transformRef.current.y = screenY - panStartRef.current.y;
    }
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldK = transformRef.current.k;
    const newK = Math.min(2.5, Math.max(0.5, oldK * zoomFactor));

    const worldPos = screenToWorld(screenX, screenY);
    transformRef.current.k = newK;
    transformRef.current.x = screenX - worldPos.x * newK;
    transformRef.current.y = screenY - worldPos.y * newK;
    setZoomLevel(newK);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '82vh', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      
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
                    ? `Path found in ${discoveredPath.length - 1} step(s)!` 
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
      <div style={{ display: 'flex', flexGrow: 1, gap: '1.25rem', position: 'relative', minHeight: '560px' }}>
        
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: isPanningRef.current ? 'grabbing' : dragNodeRef.current ? 'grabbing' : 'grab'
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
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
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

          {/* Pan & Zoom Navigation Floating Toolbar */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-color)',
            borderRadius: '100px',
            padding: '0.3rem 0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}>
            <button
              onClick={() => handleZoom(0.2)}
              title="Zoom In"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={15} />
            </button>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '36px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(-0.2)}
              title="Zoom Out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={15} />
            </button>
            <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
            <button
              onClick={handleFitView}
              title="Fit to Screen"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={handleRelayout}
              title="Reset Layout & Center"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={13} />
            </button>
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
