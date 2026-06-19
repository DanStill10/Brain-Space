import { Particle } from './models/Particle.js';
import { IdeaNode } from './models/IdeaNode.js';

/**
 * Atmosphere Engine (The Application Core)
 * 
 * This file is the primary engine for the "Brain Space" visualization. 
 * Why a canvas-based approach instead of standard DOM elements? Performance and flexibility. 
 * When dealing with dozens or hundreds of moving, colliding, and glowing objects, the HTML DOM 
 * becomes a bottleneck. The HTML5 `<canvas>` provides a low-level drawing surface where we 
 * can render at 60fps using a custom game-like loop.
 * 
 * This file manages:
 * 1. The Global State (which ideas exist, where the camera is).
 * 2. The Animation Loop (calculating physics updates and drawing frames).
 * 3. The Input Handlers (translating mouse/touch events into world-space interactions).
 * 4. The API synchronization (fetching and saving state to the Laravel backend).
 */

// --- Global State & DOM Elements ---
const canvas = document.getElementById('atmosphere');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('goal-modal');
const form = document.getElementById('goal-form');
const input = document.getElementById('goal-input');
const colorInput = document.getElementById('goal-color');
const priorityInput = document.getElementById('goal-priority');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const backBtn = document.getElementById('back-btn'); 
const blackHole = document.getElementById('black-hole');

// Mission Report Elements
const missionReport = document.getElementById('mission-report');
const reportTitle = document.getElementById('report-title');
const reportPriority = document.getElementById('report-priority');
const reportStatus = document.getElementById('report-status');
const reportChildren = document.getElementById('report-children');
const rescueSector = document.getElementById('rescue-sector');
const stabilizeBtn = document.getElementById('stabilize-btn');
const uplinkProgress = document.getElementById('uplink-progress');
const uplinkPercent = document.getElementById('uplink-percent');

let width, height;
let ideas = [];
let ambientParticles = [];
let draggedIdea = null; 
let focusedIdea = null;

// Camera & Starchart Offset
let camX = 0;
let camY = 0;
let targetCamX = 0;
let targetCamY = 0;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Uplink State
let isUplinking = false;
let uplinkValue = 0;
let uplinkStartTime = 0;

// --- STATE MACHINE ---
let viewState = 'ATMOSPHERE'; // ATMOSPHERE, TRANSITION_IN, INSIDE, TRANSITION_OUT
let zoomedParent = null; 
let zoomedIdeas = [];    
let transitionProgress = 0; 
let targetZoom = 1;

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

function updateMissionReport(idea) {
    if (!idea) {
        missionReport.classList.add('opacity-0', 'translate-x-[-20px]');
        missionReport.classList.remove('opacity-100', 'translate-x-0');
        return;
    }

    reportTitle.innerText = idea.text;
    reportPriority.innerText = idea.priority.toFixed(1);
    
    if (idea.isDecayed) {
        reportStatus.innerText = "DECAYED";
        reportStatus.className = "text-xl font-mono text-rose-500 animate-pulse";
        rescueSector.classList.remove('hidden');
    } else if (idea.isWaning) {
        reportStatus.innerText = "WANING";
        reportStatus.className = "text-xl font-mono text-amber-400";
        rescueSector.classList.remove('hidden');
    } else {
        reportStatus.innerText = "STABLE";
        reportStatus.className = "text-xl font-mono text-emerald-400";
        rescueSector.classList.add('hidden');
    }

    if (idea.children && idea.children.length > 0) {
        reportChildren.innerText = idea.children.map(c => `> ${c.text}`).join('\n');
    } else {
        reportChildren.innerText = "No sub-modules detected.";
    }

    missionReport.classList.remove('opacity-0', 'translate-x-[-20px]');
    missionReport.classList.add('opacity-100', 'translate-x-0');
    
    // Reset uplink UI
    uplinkValue = 0;
    uplinkProgress.style.width = '0%';
    uplinkPercent.innerText = '0%';
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

const WORLD_SIZE = 5000;

function initParticles() {
    ambientParticles = [];
    for(let i = 0; i < 400; i++) {
        ambientParticles.push(new Particle(WORLD_SIZE, WORLD_SIZE)); 
    }
}
initParticles();

// --- ANIMATION ENGINE ---
function animate() {
    ctx.clearRect(0, 0, width, height);

    // 1. Camera Smoothing
    camX += (targetCamX - camX) * 0.08;
    camY += (targetCamY - camY) * 0.08;

    // 2. Uplink Logic
    if (isUplinking && focusedIdea && (focusedIdea.isDecayed || focusedIdea.isWaning)) {
        const elapsed = Date.now() - uplinkStartTime;
        uplinkValue = Math.min(100, (elapsed / 1500) * 100);
        uplinkProgress.style.width = `${uplinkValue}%`;
        uplinkPercent.innerText = `${Math.floor(uplinkValue)}%`;

        if (uplinkValue >= 100) {
            completeUplink();
        }
    }

    // 3. Render
    if (viewState === 'INSIDE') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
        grad.addColorStop(1, '#05070a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        zoomedIdeas.forEach(idea => { 
            idea.update(zoomedIdeas); 
            idea.draw(ctx, 1, idea === focusedIdea); 
        });

    } else {
        const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const e = ease(transitionProgress);
        const currentZoom = 1 + (targetZoom - 1) * e;
        
        ctx.save();
        
        // 1. Center everything on the viewport
        ctx.translate(width / 2, height / 2);
        
        // 2. Apply Camera Autopilot / Panning
        ctx.translate(camX, camY);
        
        // 3. Apply Zoom
        ctx.scale(currentZoom, currentZoom);

        // 4. Handle transition focus if zooming into a parent
        if (zoomedParent) {
            ctx.translate(-zoomedParent.x * e, -zoomedParent.y * e);
        }

        if (viewState === 'ATMOSPHERE') {
            ambientParticles.forEach(p => p.update(WORLD_SIZE, WORLD_SIZE));
            ideas.forEach(idea => idea.update(ideas));
        }

        ambientParticles.forEach(p => p.draw(ctx));
        ideas.forEach(idea => idea.draw(ctx, currentZoom, idea === focusedIdea, camX, camY)); 

        ctx.restore();

        if (transitionProgress > 0 && zoomedParent) {
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
            grad.addColorStop(1, '#05070a');
            ctx.globalAlpha = e; 
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }
    }

    requestAnimationFrame(animate);
}

async function completeUplink() {
    isUplinking = false;
    const idea = focusedIdea;
    idea.lastInteractedAt = new Date();
    idea.isDecayed = false;
    idea.isWaning = false;
    
    stabilizeBtn.innerText = "UPLINK ESTABLISHED";
    stabilizeBtn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/40');

    try {
        await fetch(`/api/ideas/${idea.id}/rescue`, {
            method: 'PUT',
            headers: { 'X-CSRF-TOKEN': getCsrfToken() }
        });
    } catch (err) { console.error("Rescue failed", err); }

    setTimeout(() => {
        updateMissionReport(idea);
        stabilizeBtn.innerText = "ESTABLISH UPLINK";
        stabilizeBtn.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/40');
    }, 2000);
}

animate();

// --- INTERACTION ---

function showModal() {
    modal.classList.remove('hidden-animate');
    addBtn.classList.add('hidden');
    blackHole.classList.add('opacity-0');
    focusedIdea = null;
    updateMissionReport(null);
    setTimeout(() => input.focus(), 100);
}

function hideModal() {
    modal.classList.add('hidden-animate');
    addBtn.classList.remove('hidden');
    blackHole.classList.remove('opacity-0');
    input.value = '';
    input.blur();
}

addBtn.addEventListener('click', showModal);
cancelBtn.addEventListener('click', hideModal);

function getPointerPos(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (touch) return { x: touch.clientX, y: touch.clientY };
    return { x: e.clientX, y: e.clientY };
}

let lastTapTime = 0;

function handleStart(e) {
    if (viewState !== 'ATMOSPHERE' && viewState !== 'INSIDE') return;
    if (!modal.classList.contains('hidden-animate')) {
        hideModal();
        return;
    }

    const pos = getPointerPos(e);
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    const isDoubleTap = tapLength < 300 && tapLength > 0;
    lastTapTime = currentTime;

    // World space conversion
    const worldX = pos.x - (width / 2) - camX;
    const worldY = pos.y - (height / 2) - camY;

    const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;
    let found = false;

    for (let i = activeArray.length - 1; i >= 0; i--) {
        const idea = activeArray[i];
        if (Math.hypot(idea.x - worldX, idea.y - worldY) < idea.radius) {
            found = true;
            focusedIdea = idea;
            updateMissionReport(idea);

            // AUTO-CENTER: Only on initial click
            // But we'll allow handleMove to override this if dragging starts
            targetCamX = -idea.x + 150; // Offset slightly for HUD
            targetCamY = -idea.y;

            // ENTER ZOOM VIEW (Double Tap)
            if (isDoubleTap && viewState === 'ATMOSPHERE' && idea.children && idea.children.length > 0) {
                enterZoomView(idea);
                return; 
            }

            draggedIdea = idea;
            idea.isDragging = true;
            break;
        }
    }

    if (!found) {
        focusedIdea = null;
        updateMissionReport(null);
        isPanning = true;
        lastMouseX = pos.x;
        lastMouseY = pos.y;
    }
}

function handleMove(e) {
    const pos = getPointerPos(e);

    if (draggedIdea) {
        draggedIdea.x = pos.x - (width / 2) - camX;
        draggedIdea.y = pos.y - (height / 2) - camY;

        // PREVENT JARRING: Freeze autopilot while actively moving an idea
        targetCamX = camX;
        targetCamY = camY;

        // Black Hole is fixed UI, so use screen pos
        const bhRect = blackHole.getBoundingClientRect();
        const distToBH = Math.hypot(pos.x - (bhRect.left + bhRect.width/2), pos.y - (bhRect.top + bhRect.height/2));
        if (distToBH < 100) blackHole.classList.add('active');
        else blackHole.classList.remove('active');

    } else if (isPanning) {
        targetCamX += (pos.x - lastMouseX);
        targetCamY += (pos.y - lastMouseY);
        lastMouseX = pos.x;
        lastMouseY = pos.y;
    }
}

function handleEnd(e) {
    isPanning = false;
    isUplinking = false; 

    if (draggedIdea) {
        draggedIdea.isDragging = false;
        
        const pos = getPointerPos(e);
        const bhRect = blackHole.getBoundingClientRect();
        const distToBH = Math.hypot(pos.x - (bhRect.left + bhRect.width/2), pos.y - (bhRect.top + bhRect.height/2));
        
        // 1. VOID DELETION
        if (distToBH < 80) {
            deleteIdea(draggedIdea.id);
            ideas = ideas.filter(n => n.id !== draggedIdea.id);
            focusedIdea = null;
            updateMissionReport(null);
            draggedIdea = null;
            blackHole.classList.remove('active');
            return;
        }

        // 2. ABSORPTION / MERGING
        const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;

        for (let i = 0; i < activeArray.length; i++) {
            const targetIdea = activeArray[i];
            
            if (targetIdea !== draggedIdea) {
                // Use world coordinates for merging distance
                const dist = Math.hypot(draggedIdea.x - targetIdea.x, draggedIdea.y - targetIdea.y);
                
                // If touching surfaces
                if (dist < targetIdea.radius + draggedIdea.radius) {
                    // Restriction: Can't merge inside zoom view yet
                    if (viewState === 'INSIDE') break; 
                    
                    // Logic: Parent cannot be absorbed by a child, and 2 parents can't merge
                    if (draggedIdea.children.length > 0) break; 
                    
                    targetIdea.absorb(draggedIdea);
                    ideas = ideas.filter(node => node.id !== draggedIdea.id);
                    
                    // If the absorbed idea was in focus, clear it
                    if (focusedIdea === draggedIdea) {
                        focusedIdea = targetIdea;
                        updateMissionReport(targetIdea);
                    }

                    try {
                        fetch(`/api/ideas/${draggedIdea.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken()
                            },
                            body: JSON.stringify({ parent_id: targetIdea.id })
                        });
                    } catch (err) { console.error("Failed to merge", err); }
                    
                    break; 
                }
            }
        }
        draggedIdea = null;
        blackHole.classList.remove('active');
    }
}

async function deleteIdea(id) {
    try {
        await fetch(`/api/ideas/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': getCsrfToken() }
        });
    } catch (err) { console.error(err); }
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);

// Uplink Long Press
stabilizeBtn.addEventListener('mousedown', () => {
    isUplinking = true;
    uplinkStartTime = Date.now();
});
stabilizeBtn.addEventListener('mouseup', () => {
    isUplinking = false;
    uplinkValue = 0;
    uplinkProgress.style.width = '0%';
});
stabilizeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isUplinking = true;
    uplinkStartTime = Date.now();
});
stabilizeBtn.addEventListener('touchend', () => {
    isUplinking = false;
});

// --- Boot ---
async function loadIdeas() {
    try {
        const response = await fetch('/api/ideas'); 
        const data = await response.json();
        
        data.active.forEach(item => {
            // SPAWNING: Initial jitter around world center (0,0)
            const spawnX = (Math.random() - 0.5) * 400;
            const spawnY = (Math.random() - 0.5) * 400;

            const node = new IdeaNode(item.id, item.text, spawnX, spawnY, item.color, item.priority, ctx, item.last_interacted_at);
            if (item.children) item.children.forEach(c => node.absorb(c));
            ideas.push(node);
        });

        if (ideas.length === 0) showModal(); else hideModal();
    } catch (err) { console.warn(err); showModal(); }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await fetch('/api/ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
            body: JSON.stringify({ text, color: colorInput.value, priority: priorityInput.value })
        });
        const saved = await response.json();
        const spawnX = (Math.random() - 0.5) * 200;
        const spawnY = (Math.random() - 0.5) * 200;
        ideas.push(new IdeaNode(saved.id, saved.text, spawnX, spawnY, saved.color, saved.priority, ctx, saved.last_interacted_at));
        hideModal();
    } catch (err) { console.error(err); }
});

loadIdeas();