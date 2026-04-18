/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, MousePointer2, Settings, Shield, Cpu, Zap } from 'lucide-react';

// --- Types & Constants ---

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  originalX: number;
  originalY: number;
}

const PARTICLE_COUNT = 420;
const CONNECTION_DISTANCE = 100;
const MOUSE_RADIUS = 120;
const SCATTER_FORCE = 15;
const RETURN_SPEED = 0.05;
const FRICTION = 0.95;

const NEON_GREEN = '#00ff9f';
const NEON_PURPLE = '#bc13fe';

// --- Utilities ---

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// --- Main Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ count: PARTICLE_COUNT, mx: 0, my: 0, fps: 0 });
  const [isSystemActive, setIsSystemActive] = useState(true);
  
  const particles = useRef<Point[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const requestRef = useRef<number>(null);

  const initParticles = useCallback((width: number, height: number) => {
    particles.current = Array.from({ length: PARTICLE_COUNT }).map(() => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        originalX: x,
        originalY: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? NEON_GREEN : NEON_PURPLE,
      };
    });
  }, []);

  const update = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Canvas Background Gradient
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#050508');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    particles.current.forEach((p, i) => {
      // 1. Mouse Interaction (Scatter)
      const dx = mouse.current.x - p.x;
      const dy = mouse.current.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MOUSE_RADIUS) {
        const angle = Math.atan2(dy, dx);
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        p.vx -= Math.cos(angle) * force * SCATTER_FORCE;
        p.vy -= Math.sin(angle) * force * SCATTER_FORCE;
      }

      // 2. Return to "Home" (Original Position)
      const returnDx = p.originalX - p.x;
      const returnDy = p.originalY - p.y;
      p.vx += returnDx * RETURN_SPEED;
      p.vy += returnDy * RETURN_SPEED;

      // 3. Apply Velocity & Friction
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx;
      p.y += p.vy;

      // 4. Draw Connections
      for (let j = i + 1; j < particles.current.length; j++) {
        const p2 = particles.current[j];
        const dx2 = p.x - p2.x;
        const dy2 = p.y - p2.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist2 < CONNECTION_DISTANCE) {
          ctx.beginPath();
          ctx.lineWidth = 0.5 * (1 - dist2 / CONNECTION_DISTANCE);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.5 * (1 - dist2 / CONNECTION_DISTANCE);
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // 5. Draw Particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      initParticles(canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      if (isSystemActive) {
        update(ctx, canvas.width, canvas.height);
        setStats(prev => ({
          ...prev,
          mx: Math.round(mouse.current.x),
          my: Math.round(mouse.current.y),
          fps: Math.round(1000 / delta)
        }));
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [initParticles, update, isSystemActive]);

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    }
  };

  const handleMouseLeave = () => {
    mouse.current.x = -1000;
    mouse.current.y = -1000;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-[#050508] overflow-hidden font-mono selection:bg-purple-500/30 text-[#e0e0e5]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Simulation Canvas */}
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full cursor-none"
      />

      {/* Sophisticated UI Overlay */}
      <motion.div 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-10 left-10 w-72 h-[calc(100vh-80px)] backdrop-blur-[12px] bg-[#0a0a0f]/75 border border-[#bc13fe]/30 p-8 rounded shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_0_15px_rgba(188,19,254,0.1)] flex flex-col gap-6 z-10"
      >
        <div className="border-b border-[#bc13fe]/30 pb-4">
          <h1 className="text-lg font-bold tracking-[2px] text-[#bc13fe] uppercase shadow-[0_0_10px_rgba(188,19,254,0.5)]">Neural_Sandbox</h1>
          <div className="inline-block px-3 py-1 bg-[#00ff9f]/10 border border-[#00ff9f] text-[#00ff9f] text-[11px] font-bold uppercase mt-3 shadow-[0_0_8px_rgba(0,255,159,0.2)]">
            System Active
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-[1px]">Particle Count</span>
            <div className="text-base text-[#e0e0e5]">{stats.count}</div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-[1px]">Coordinates</span>
            <div className="text-base text-[#e0e0e5]">
              X: {stats.mx} / Y: {stats.my}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-[#bc13fe]/30 to-transparent my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-[1px]">Signal Pulse</span>
            <div className="text-base text-[#e0e0e5]">{stats.fps}.4 MHz</div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-[1px]">Latency</span>
            <div className="text-base text-[#e0e0e5]">0.002ms</div>
          </div>
        </div>

        {/* Console Area */}
        <div className="flex-grow mt-4 bg-black/30 border border-white/5 p-4 text-[11px] leading-[1.5] text-[#888] overflow-hidden">
          &gt; INITIALIZING PARTICLE SWARM...<br/>
          &gt; ESTABLISHING NEURAL LINKS...<br/>
          &gt; KERNEL STATUS: OPTIMAL<br/>
          &gt; WAITING FOR USER INTERACTION...<br/>
          &gt; [SYSTEM] READY
        </div>

        {/* Footer info (Minimal) */}
        <div className="flex items-center gap-3 pt-4 opacity-30">
           <Shield size={12} />
           <span className="text-[9px] uppercase tracking-widest font-bold">Secure Environment</span>
        </div>
      </motion.div>

      {/* Pulse / Activity Indicator at Cursor */}
      <AnimatePresence>
        {stats.mx !== -1000 && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ left: stats.mx, top: stats.my }}
            className="absolute w-5 h-5 border border-[#00ff9f] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-5"
          />
        )}
      </AnimatePresence>

      {/* Custom Mouse Guidance */}
      <AnimatePresence>
        {stats.mx === -1000 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-[#00ff9f] text-[10px] uppercase tracking-[4px] animate-pulse">
              Connect External Interface
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
