import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { HelpCircle } from 'lucide-react';

export const Graph = () => {
  const { token } = useAuth();
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const selectedNodeRef = useRef(null);
  selectedNodeRef.current = selectedNode;
  
  const canvasRef = useRef(null);
  
  // Dragging state
  const dragNodeRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [error, setError] = useState('');

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
        
        // Initialize position coordinate values for force simulation
        const nodes = json.nodes.map((node, idx) => ({
          ...node,
          x: 250 + Math.cos(idx) * 120,
          y: 250 + Math.sin(idx) * 120,
          vx: 0,
          vy: 0,
          radius: node.type === 'note' ? 12 : node.type === 'contact' ? 10 : 9
        }));
        
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

  // Run custom force-directed simulation loop
  useEffect(() => {
    if (loading || data.nodes.length === 0 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const runSimulation = () => {
      const width = canvas.width;
      const height = canvas.height;
      const nodes = [...data.nodes];
      const edges = data.edges;

      // 1. Force Simulation Mathematics
      const kRepel = 2000;    // Repulsive force multiplier
      const kAttract = 0.04;  // Hooke's law spring stiffness
      const gravity = 0.01;   // Force drawing to center
      const damping = 0.85;   // Velocity damping factor

      // Calculate repelling forces (charge) between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 280) {
            // Repelling force direction
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

      // Calculate attraction forces along relationship edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          
          const force = kAttract * (dist - 80); // Spring natural rest length = 80
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

      // Gravity and boundary movement limits
      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;
        
        // Gravity to center
        node.vx += (width / 2 - node.x) * gravity;
        node.vy += (height / 2 - node.y) * gravity;

        // Apply velocities
        node.x += node.vx;
        node.y += node.vy;
        
        // Apply friction damping
        node.vx *= damping;
        node.vy *= damping;

        // Contain in boundaries
        node.x = Math.max(node.radius + 10, Math.min(width - node.radius - 10, node.x));
        node.y = Math.max(node.radius + 10, Math.min(height - node.radius - 10, node.y));
      });

      // 2. Draw Graph Canvas Frame
      ctx.clearRect(0, 0, width, height);

      // Draw Edges (Solid clean line style)
      ctx.strokeStyle = 'var(--border-color)';
      ctx.lineWidth = 1;
      
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        // Draw selection halo first
        const isSel = selectedNodeRef.current && node.id === selectedNodeRef.current.id;
        if (isSel) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(109, 93, 252, 0.4)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        
        // Select fill color based on type
        if (node.type === 'note') {
          ctx.fillStyle = 'var(--purple-accent)'; // Premium Purple Accent
        } else if (node.type === 'contact') {
          ctx.fillStyle = 'var(--text-primary)'; // Monochrome dark
        } else {
          ctx.fillStyle = '#10B981'; // Quiet Green Task
        }
        ctx.fill();
        
        // Node Border Outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label Typography (clean & quiet)
        ctx.fillStyle = 'var(--text-primary)';
        ctx.font = '500 10px var(--font-sans)';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      animationFrameId = requestAnimationFrame(runSimulation);
    };

    runSimulation();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading, data]);

  // Drag interaction events
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find clicked node
    const foundNode = data.nodes.find(node => {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      return (dx * dx + dy * dy) < (node.radius * node.radius + 40);
    });

    if (foundNode) {
      dragNodeRef.current = foundNode;
      setSelectedNode(foundNode);
      offsetRef.current = {
        x: foundNode.x - mouseX,
        y: foundNode.y - mouseY
      };
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!dragNodeRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    dragNodeRef.current.x = mouseX + offsetRef.current.x;
    dragNodeRef.current.y = mouseY + offsetRef.current.y;
    dragNodeRef.current.vx = 0;
    dragNodeRef.current.vy = 0;
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  const getConnections = () => {
    if (!selectedNode) return [];
    return data.edges
      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
      .map(e => {
        const neighborId = e.source === selectedNode.id ? e.target : e.source;
        return data.nodes.find(n => n.id === neighborId);
      })
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        Expanding cognitive coordinates graph...
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {error && (
        <div style={{
          backgroundColor: '#FCE8E6',
          color: 'var(--red-accent)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '2rem',
          border: '1px solid #FAD2CF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-accent)', fontWeight: 600 }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Memory Graph
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            A living map showing how your notes, contacts, and tasks connect. Drag nodes to explore.
          </p>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.75rem',
          padding: '0.375rem 0.75rem',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--warm-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--purple-accent)' }} />
            <span>Notes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-primary)' }} />
            <span>Contacts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>Tasks</span>
          </div>
        </div>
      </div>

      {data.nodes.length === 0 ? (
        <div style={{ 
          flexGrow: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--warm-bg)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <HelpCircle size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Graph contains no nodes yet.</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Write notes that reference tasks and people to start connecting the dots.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexGrow: 1, gap: '2rem', minHeight: 0, height: '100%' }}>
          {/* Canvas Wrapper */}
          <div style={{ 
            flexGrow: 1, 
            position: 'relative', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--warm-bg)',
            overflow: 'hidden'
          }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                cursor: 'grab'
              }}
            />
          </div>

          {/* Selected Node Sidebar Detail Panel */}
          {selectedNode && (
            <div style={{
              width: '300px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.5rem',
              backgroundColor: 'var(--canvas-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              flexShrink: 0,
              overflowY: 'auto'
            }}>
              <div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  letterSpacing: '0.08em', 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  {selectedNode.type} Memory
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
                  {selectedNode.label}
                </h3>
              </div>

              <div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  letterSpacing: '0.08em', 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Connected To
                </span>
                {getConnections().length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                    No connections detected.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {getConnections().map((conn, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedNode(conn)}
                        style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--text-primary)', 
                          padding: '0.5rem 0.75rem', 
                          backgroundColor: 'var(--warm-bg)', 
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'var(--transition)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: conn.type === 'note' ? 'var(--purple-accent)' : conn.type === 'contact' ? 'var(--text-primary)' : '#10B981'
                        }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                          {conn.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
