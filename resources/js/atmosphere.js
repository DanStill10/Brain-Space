import { Particle } from './models/Particle.js';
import { IdeaNode } from './models/IdeaNode.js';

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

let width, height;
let ideas = [];
let ambientParticles = [];
let draggedIdea = null; 

// --- STATE MACHINE & CINEMATIC CAMERA ---
let viewState = 'ATMOSPHERE'; // ATMOSPHERE, TRANSITION_IN, INSIDE, TRANSITION_OUT
let zoomedParent = null; 
let zoomedIdeas = [];    
let lastTapTime = 0;     

let transitionProgress = 0; // 0 to 1
let targetZoom = 1;

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

function initParticles() {
    ambientParticles = [];
    for(let i = 0; i < 150; i++) {
        ambientParticles.push(new Particle(width, height));
    }
}
initParticles();

// --- MICRO-ATMOSPHERE LOGIC ---

function enterZoomView(parentIdea) {
    zoomedParent = parentIdea;
    viewState = 'TRANSITION_IN';
    
    // Calculate the exact zoom needed so the bubble engulfs the entire screen diagonal
    const screenDiag = Math.sqrt(width*width + height*height);
    targetZoom = (screenDiag / 2) / parentIdea.radius + 2; 

    addBtn.classList.add('hidden'); 
}

function exitZoomView(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // THE REVERSE HAND-OFF: 
    // Snap the tiny lava blobs to exactly where the massive bubbles currently are
    // so the reverse camera zoom is 100% seamless!
    zoomedParent.children.forEach(child => {
        const activeBubble = zoomedIdeas.find(zi => zi.id === child.id);
        if (activeBubble) {
            child.offsetX = (activeBubble.x - (width/2)) / targetZoom;
            child.offsetY = (activeBubble.y - (height/2)) / targetZoom;
        }
    });

    viewState = 'TRANSITION_OUT';
    backBtn.classList.add('hidden');
    zoomedIdeas = []; // Clear the full-sized bubbles
}

backBtn.addEventListener('click', exitZoomView);
backBtn.addEventListener('touchstart', exitZoomView, { passive: false });

// --- ANIMATION ENGINE ---
function animate() {
    ctx.clearRect(0, 0, width, height);

    // 1. UPDATE CAMERA PROGRESS
    if (viewState === 'TRANSITION_IN') {
        transitionProgress += 0.015; // Animation Speed (approx 1s at 60fps)
        if (transitionProgress >= 1) {
            transitionProgress = 1;
            viewState = 'INSIDE';
            
            // THE SEAMLESS HAND-OFF: 
            // Spawn the new bubbles at the exact massive screen coordinates the lava was occupying
            zoomedIdeas = zoomedParent.children.map(child => {
                const spawnX = (width/2) + (child.offsetX * targetZoom);
                const spawnY = (height/2) + (child.offsetY * targetZoom);
                
                const newChild = new IdeaNode(child.id, child.text, spawnX, spawnY, null, 0, ctx); 
                newChild.colorStart = child.colorStart;
                newChild.colorEnd = child.colorEnd;
                
                // Spawn them HUGE so they gracefully shrink down to their target radius
                newChild.radius = child.radius * targetZoom;
                
                return newChild;
            });
            backBtn.classList.remove('hidden');
        }
    } else if (viewState === 'TRANSITION_OUT') {
        transitionProgress -= 0.015;
        if (transitionProgress <= 0) {
            transitionProgress = 0;
            viewState = 'ATMOSPHERE';
            zoomedParent = null;
            addBtn.classList.remove('hidden');
        }
    }

    // 2. RENDER THE ENVIRONMENT
    if (viewState === 'INSIDE') {
        // FULLY ZOOMED IN
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
        grad.addColorStop(1, '#111827');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        zoomedIdeas.forEach(idea => { 
            idea.update(zoomedIdeas, width, height); 
            idea.draw(ctx); 
        });

    } else {
        // ATMOSPHERE OR TRANSITION
        // Easing Function for buttery smooth camera glide (Ease In-Out Cubic)
        const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const e = ease(transitionProgress);
        
        const currentZoom = 1 + (targetZoom - 1) * e;
        
        // Target tracking: Lock dead-center onto the parent bubble
        let focusX = width / 2;
        let focusY = height / 2;
        if (zoomedParent) {
            focusX = (width / 2) + (zoomedParent.x - (width / 2)) * e;
            focusY = (height / 2) + (zoomedParent.y - (height / 2)) * e;
        }

        ctx.save();
        
        // Apply the Cinematic Camera Matrix
        ctx.translate(width / 2, height / 2);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-focusX, -focusY);

        // ONLY update main physics if time isn't frozen
        if (viewState === 'ATMOSPHERE') {
            ambientParticles.forEach(p => p.update(width, height));
            ideas.forEach(idea => idea.update(ideas, width, height));
        }

        // Draw everything (passing currentZoom so IdeaNode can fade the text)
        ambientParticles.forEach(p => p.draw(ctx));
        ideas.forEach(idea => idea.draw(ctx, currentZoom)); 

        ctx.restore();

        // Smoothly fade the dark background in/out behind the zooming bubbles
        if (transitionProgress > 0 && zoomedParent) {
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
            grad.addColorStop(1, '#111827');
            ctx.globalAlpha = e; // Sync alpha to the easing curve
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }
    }

    requestAnimationFrame(animate);
}

animate();

// --- UI Interaction & Drag Physics ---

function showModal() {
    modal.classList.remove('hidden-animate');
    if(ideas.length > 0) cancelBtn.classList.remove('hidden');
    addBtn.classList.add('hidden');
    setTimeout(() => input.focus(), 100);
}

function hideModal() {
    modal.classList.add('hidden-animate');
    addBtn.classList.remove('hidden');
    input.value = '';
    colorInput.value = '';
    priorityInput.value = '0';
    input.blur();
}

cancelBtn.addEventListener('click', hideModal);
addBtn.addEventListener('click', showModal);

function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function handleStart(e) {
    // PREVENT TOUCHING BUBBLES WHILE THE CAMERA IS FLYING
    if (viewState === 'TRANSITION_IN' || viewState === 'TRANSITION_OUT') return;

    if (ideas.length > 0 && !modal.classList.contains('hidden-animate')) {
        hideModal();
        return;
    }

    const pos = getPointerPos(e);
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    const isDoubleTap = tapLength < 300 && tapLength > 0;
    lastTapTime = currentTime;

    const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;

    for (let i = activeArray.length - 1; i >= 0; i--) {
        const idea = activeArray[i];
        const dist = Math.hypot(idea.x - pos.x, idea.y - pos.y);
        
        if (dist < idea.radius) {
            
            // FIRE THE ZOOM SEQUENCE
            if (isDoubleTap && viewState === 'ATMOSPHERE' && idea.children && idea.children.length > 0) {
                enterZoomView(idea);
                return; 
            }

            draggedIdea = idea;
            idea.isDragging = true;
            if(e.cancelable) e.preventDefault(); 
            break;
        }
    }
}

function handleMove(e) {
    if (draggedIdea) {
        if(e.cancelable) e.preventDefault(); 
        const pos = getPointerPos(e);
        draggedIdea.x = pos.x;
        draggedIdea.y = pos.y;
    }
}

async function handleEnd(e) {
    if (draggedIdea) {
        draggedIdea.isDragging = false;
        const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;

        for (let i = 0; i < activeArray.length; i++) {
            const targetIdea = activeArray[i];
            
            if (targetIdea !== draggedIdea) {
                const dist = Math.hypot(draggedIdea.x - targetIdea.x, draggedIdea.y - targetIdea.y);
                
                if (dist < targetIdea.radius + draggedIdea.radius) {
                    
                    if (viewState === 'INSIDE') break; 
                    if (draggedIdea.children && draggedIdea.children.length > 0) break; 
                    
                    targetIdea.absorb(draggedIdea);
                    ideas = ideas.filter(node => node.id !== draggedIdea.id);
                    
                    try {
                        await fetch(`/api/ideas/${draggedIdea.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken()
                            },
                            body: JSON.stringify({ parent_id: targetIdea.id })
                        });
                    } catch (err) {
                        console.error("Failed to merge", err);
                    }
                    
                    break; 
                }
            }
        }
        draggedIdea = null;
    }
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);
canvas.addEventListener('touchcancel', handleEnd);

// --- Boot Sequence ---
async function loadIdeas() {
    try {
        const response = await fetch('/api/ideas'); 
        if (!response.ok) throw new Error("Backend not ready yet");
        const data = await response.json();
        
        data.forEach(item => {
            const newParent = new IdeaNode(item.id, item.text, width/2, height/2 + 50, item.color, item.priority, ctx);
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => newParent.absorb(child));
            }
            ideas.push(newParent);
        });

        if (ideas.length > 0) hideModal(); else showModal(); 
    } catch (error) {
        console.warn("Running in memory.", error);
        if(ideas.length === 0) showModal(); 
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const text = input.value.trim();
    const color = colorInput.value;
    const priority = parseInt(priorityInput.value) || 0;
    const submitBtn = document.getElementById('submit-btn');
    
    if (text) {
        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
                body: JSON.stringify({ text, color, priority })
            });

            if (!response.ok) throw new Error("Failed");
            const savedItem = await response.json();
            ideas.push(new IdeaNode(savedItem.id, savedItem.text, width/2, height/2 + 50, savedItem.color, savedItem.priority, ctx));
            hideModal();
        } catch (error) {
            ideas.push(new IdeaNode(`temp-${Date.now()}`, text, width/2, height/2 + 50, color, priority, ctx));
            hideModal();
        } finally {
            submitBtn.innerText = "Add to Atmosphere";
            submitBtn.disabled = false;
        }
    }
});

loadIdeas();