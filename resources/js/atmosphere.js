import { Particle } from './models/particle.js';
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
const blackHole = document.getElementById('black-hole');

// Auth Elements
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authNameGroup = document.getElementById('auth-name-group');
const authConfirmGroup = document.getElementById('auth-confirm-group');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const logoutBtn = document.getElementById('logout-btn');

let isLoginMode = true;
const isAuthenticated = document.querySelector('meta[name="auth-check"]')?.getAttribute('content') === 'true';

// Mission Report Elements
const missionReport = document.getElementById('mission-report');
const reportTitle = document.getElementById('report-title');
const reportPriority = document.getElementById('report-priority');
const reportStatus = document.getElementById('report-status');
const reportChildren = document.getElementById('report-children');

let width, height;
let deviceScale = 1;
let ideas = [];
let completedIdeas = []; // For constellations
let ambientDust = [];
let legacyStars = []; // For future completed goals (Constellations)
let transientFX = []; // For future Supernovas/Comets
let draggedIdea = null; 
let focusedIdea = null;

// --- STATE MACHINE & CINEMATIC CAMERA ---
let viewState = 'ATMOSPHERE'; // ATMOSPHERE, TRANSITION_IN, INSIDE, TRANSITION_OUT
let zoomedParent = null; 
let zoomedIdeas = [];    
let lastTapTime = 0;     

let transitionProgress = 0; // 0 to 1
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
    } else if (idea.isWaning) {
        reportStatus.innerText = "WANING";
        reportStatus.className = "text-xl font-mono text-amber-400";
    } else {
        reportStatus.innerText = "STABLE";
        reportStatus.className = "text-xl font-mono text-emerald-400";
    }

    if (idea.children && idea.children.length > 0) {
        reportChildren.innerText = idea.children.map(c => `> ${c.text}`).join('\n');
    } else {
        reportChildren.innerText = "No sub-modules detected.";
    }

    missionReport.classList.remove('opacity-0', 'translate-x-[-20px]');
    missionReport.classList.add('opacity-100', 'translate-x-0');
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    deviceScale = Math.max(0.45, Math.min(1.0, Math.sqrt(width / 1440)));
}
window.addEventListener('resize', resize);
resize();

function initAmbientDust() {
    ambientDust = [];
    for(let i = 0; i < 150; i++) {
        ambientDust.push(new Particle(width, height));
    }
}
initAmbientDust();

function drawNebulae(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.filter = 'blur(60px)';

    const nebulae = [
        { x: width * 0.2, y: height * 0.3, r: Math.min(width, height) * 0.4, color: '#312e81' },
        { x: width * 0.8, y: height * 0.6, r: Math.min(width, height) * 0.35, color: '#4c1d95' },
        { x: width * 0.5, y: height * 0.8, r: Math.min(width, height) * 0.3, color: '#1e3a8a' },
    ];

    nebulae.forEach(n => {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

// --- MICRO-ATMOSPHERE LOGIC ---

function enterZoomView(parentIdea) {
    zoomedParent = parentIdea;
    viewState = 'TRANSITION_IN';
    focusedIdea = null;
    updateMissionReport(null);
    
    // Calculate the exact zoom needed so the bubble engulfs the entire screen diagonal
    const screenDiag = Math.sqrt(width*width + height*height);
    targetZoom = (screenDiag / 2) / parentIdea.radius + 2; 

    addBtn.classList.add('hidden'); 
    blackHole.classList.add('opacity-0');
}

function exitZoomView(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // THE REVERSE HAND-OFF: 
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
        transitionProgress += 0.015; 
        if (transitionProgress >= 1) {
            transitionProgress = 1;
            viewState = 'INSIDE';
            
            zoomedIdeas = zoomedParent.children.map(child => {
                const spawnX = (width/2) + (child.offsetX * targetZoom);
                const spawnY = (height/2) + (child.offsetY * targetZoom);
                
                const newChild = new IdeaNode(child.id, child.text, spawnX, spawnY, null, 0, ctx, null, deviceScale); 
                newChild.colorStart = child.colorStart;
                newChild.colorEnd = child.colorEnd;
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
            blackHole.classList.remove('opacity-0');
        }
    }

    // 2. RENDER THE ENVIRONMENT
    if (viewState === 'INSIDE') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
        grad.addColorStop(1, '#111827');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        zoomedIdeas.forEach(idea => { 
            idea.update(zoomedIdeas, width, height); 
            idea.draw(ctx, 1, idea === focusedIdea); 
        });

    } else {
        const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const e = ease(transitionProgress);
        
        const currentZoom = 1 + (targetZoom - 1) * e;
        
        let focusX = width / 2;
        let focusY = height / 2;
        if (zoomedParent) {
            focusX = (width / 2) + (zoomedParent.x - (width / 2)) * e;
            focusY = (height / 2) + (zoomedParent.y - (height / 2)) * e;
        }

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-focusX, -focusY);

        if (viewState === 'ATMOSPHERE') {
            legacyStars.forEach(s => s.update(width, height));
            ambientDust.forEach(p => p.update(width, height));
            ideas.forEach(idea => idea.update(ideas, width, height));
            transientFX.forEach(fx => fx.update(width, height));
        }

        drawNebulae(ctx, width, height);
        legacyStars.forEach(s => s.draw(ctx));
        ambientDust.forEach(p => p.draw(ctx));
        ideas.forEach(idea => idea.draw(ctx, currentZoom, idea === focusedIdea));
        transientFX.forEach(fx => fx.draw(ctx));

        ctx.restore();

        if (transitionProgress > 0 && zoomedParent) {
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, zoomedParent.colorStart || '#3b82f6');
            grad.addColorStop(1, '#111827');
            ctx.globalAlpha = e; 
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
    colorInput.value = '';
    priorityInput.value = '0';
    input.blur();
}

cancelBtn.addEventListener('click', hideModal);
addBtn.addEventListener('click', showModal);

function getPointerPos(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (touch) return { x: touch.clientX, y: touch.clientY };
    return { x: e.clientX, y: e.clientY };
}

async function handleStart(e) {
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
    let found = false;

    for (let i = activeArray.length - 1; i >= 0; i--) {
        const idea = activeArray[i];
        const dist = Math.hypot(idea.x - pos.x, idea.y - pos.y);
        
        if (dist < idea.radius) {
            found = true;
            focusedIdea = idea;
            updateMissionReport(idea);

            // THE RESCUE: If decayed or waning, restore it!
            if (idea.isDecayed || idea.isWaning) {
                idea.lastInteractedAt = new Date();
                idea.isDecayed = false;
                idea.isWaning = false;
                
                try {
                    fetch(`/api/ideas/${idea.id}/rescue`, {
                        method: 'PUT',
                        headers: { 'X-CSRF-TOKEN': getCsrfToken() }
                    });
                } catch (err) { console.error("Rescue failed", err); }
            }

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

    if (!found) {
        focusedIdea = null;
        updateMissionReport(null);
    }
}

function handleMove(e) {
    if (draggedIdea) {
        if(e.cancelable) e.preventDefault(); 
        const pos = getPointerPos(e);
        draggedIdea.x = pos.x;
        draggedIdea.y = pos.y;

        // Void Highlight
        const bhRect = blackHole.getBoundingClientRect();
        const distToBH = Math.hypot(pos.x - (bhRect.left + bhRect.width/2), pos.y - (bhRect.top + bhRect.height/2));
        if (distToBH < 100 && viewState === 'ATMOSPHERE') {
            blackHole.classList.add('active');
        } else {
            blackHole.classList.remove('active');
        }
    } else {
        // Hover detection for focusedIdea (mouse only)
        if (e.type === 'mousemove' && !modal.classList.contains('hidden-animate')) {
            const pos = getPointerPos(e);
            const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;
            let found = false;
            for (let i = activeArray.length - 1; i >= 0; i--) {
                const idea = activeArray[i];
                if (Math.hypot(idea.x - pos.x, idea.y - pos.y) < idea.radius) {
                    if (focusedIdea !== idea) {
                        focusedIdea = idea;
                        updateMissionReport(idea);
                    }
                    found = true;
                    break;
                }
            }
            // Optional: don't clear on hover-off to keep the report sticky? 
            // Let's keep it sticky for now.
        }
    }
}

async function handleEnd(e) {
    if (draggedIdea) {
        draggedIdea.isDragging = false;
        const pos = getPointerPos(e);

        // 1. VOID DELETION
        if (viewState === 'ATMOSPHERE') {
            const bhRect = blackHole.getBoundingClientRect();
            const distToBH = Math.hypot(pos.x - (bhRect.left + bhRect.width/2), pos.y - (bhRect.top + bhRect.height/2));
            
            if (distToBH < 80) {
                const ideaId = draggedIdea.id;
                ideas = ideas.filter(node => node.id !== ideaId);
                blackHole.classList.remove('active');
                
                try {
                    await fetch(`/api/ideas/${ideaId}`, {
                        method: 'DELETE',
                        headers: { 'X-CSRF-TOKEN': getCsrfToken() }
                    });
                    // TODO: Particle explosion
                } catch (err) { console.error("Failed to delete idea", err); }
                
                draggedIdea = null;
                return;
            }
        }

        const activeArray = viewState === 'INSIDE' ? zoomedIdeas : ideas;

        for (let i = 0; i < activeArray.length; i++) {
            const targetIdea = activeArray[i];
            
            if (targetIdea !== draggedIdea) {
                const dist = Math.hypot(draggedIdea.x - targetIdea.x, draggedIdea.y - targetIdea.y);
                
                if (dist < targetIdea.radius + draggedIdea.radius) {
                    if (viewState === 'INSIDE') break; 
                    if (draggedIdea.children.length > 0 && targetIdea.children.length > 0) break;
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
                    } catch (err) { console.error("Failed to merge", err); }
                    
                    break; 
                }
            }
        }
        draggedIdea = null;
        blackHole.classList.remove('active');
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
        const response = await fetch('/api/ideas', { headers: { 'Accept': 'application/json' }}); 
        
        if (response.status === 401) {
            authModal.classList.remove('hidden-animate');
            addBtn.classList.add('hidden');
            return;
        }

        if (isAuthenticated) {
            logoutBtn.classList.remove('hidden');
        }

        const data = await response.json();
        
        completedIdeas = data.completed || [];

        data.active.forEach(item => {
            const spawnX = (Math.random() * 0.6 + 0.2) * width;
            const spawnY = (Math.random() * 0.6 + 0.2) * height;

            const newParent = new IdeaNode(
                item.id, 
                item.text, 
                spawnX, 
                spawnY, 
                item.color, 
                item.priority, 
                ctx, 
                item.last_interacted_at,
                deviceScale
            );
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
            
            const spawnX = (Math.random() * 0.6 + 0.2) * width;
            const spawnY = (Math.random() * 0.6 + 0.2) * height;

            ideas.push(new IdeaNode(
                savedItem.id, 
                savedItem.text, 
                spawnX, 
                spawnY, 
                savedItem.color, 
                savedItem.priority, 
                ctx, 
                savedItem.last_interacted_at,
                deviceScale
            ));
            hideModal();
        } catch (error) {
            const spawnX = (Math.random() * 0.6 + 0.2) * width;
            const spawnY = (Math.random() * 0.6 + 0.2) * height;
            ideas.push(new IdeaNode(`temp-${Date.now()}`, text, spawnX, spawnY, color, priority, ctx, null, deviceScale));
            hideModal();
        } finally {
            submitBtn.innerText = "Add to Atmosphere";
            submitBtn.disabled = false;
        }
    }
});

// --- Auth Logic ---
authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.innerText = "Access Your Brain Space";
        authSubmitBtn.innerText = "Log In";
        authToggleBtn.innerText = "Need an account? Register";
        authNameGroup.classList.add('hidden');
        authConfirmGroup.classList.add('hidden');
        document.getElementById('auth-name').required = false;
        document.getElementById('auth-password-confirm').required = false;
    } else {
        authTitle.innerText = "Initialize Brain Space";
        authSubmitBtn.innerText = "Register";
        authToggleBtn.innerText = "Have an account? Log In";
        authNameGroup.classList.remove('hidden');
        authConfirmGroup.classList.remove('hidden');
        document.getElementById('auth-name').required = true;
        document.getElementById('auth-password-confirm').required = true;
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/login' : '/register';
    const payload = {
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-password').value,
    };
    if (!isLoginMode) {
        payload.name = document.getElementById('auth-name').value;
        payload.password_confirmation = document.getElementById('auth-password-confirm').value;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken() 
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            // We must reload the page after login/register to grab the new CSRF token 
            // generated by the session regeneration, otherwise POST requests will 419 fail.
            window.location.reload();
        } else {
            const data = await res.json();
            alert(data.message || "Authentication failed. Please check your credentials.");
        }
    } catch (err) { console.error(err); }
});

logoutBtn.addEventListener('click', async () => {
    await fetch('/logout', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrfToken() }
    });
    window.location.reload();
});

loadIdeas();