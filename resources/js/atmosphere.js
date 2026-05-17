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

let width, height;
let ideas = [];
let ambientParticles = [];
let draggedIdea = null; // Track the currently dragged bubble

// Helper to grab Laravel's security token (Still needed for secure local POST/PUT requests)
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// --- Canvas Initialization ---
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

function animate() {
    ctx.clearRect(0, 0, width, height);
    ambientParticles.forEach(p => { p.update(width, height); p.draw(ctx); });
    ideas.forEach(idea => { idea.update(ideas, width, height); idea.draw(ctx); });
    requestAnimationFrame(animate);
}

// Start the animation loop immediately
animate();

// --- UI Interaction Logic ---
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

// --- Drag and Drop Physics (Mouse & Touch Supported) ---

// Helper to grab exact X/Y whether it's a mouse click or a screen tap
function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function handleStart(e) {
    // Close the modal if it's open
    if (ideas.length > 0 && !modal.classList.contains('hidden-animate')) {
        hideModal();
        return;
    }

    const pos = getPointerPos(e);

    // Loop backward to grab the bubble drawn "on top" first
    for (let i = ideas.length - 1; i >= 0; i--) {
        const idea = ideas[i];
        const dist = Math.hypot(idea.x - pos.x, idea.y - pos.y);
        
        if (dist < idea.radius) {
            draggedIdea = idea;
            idea.isDragging = true;
            // Prevent screen scrolling only if they actually grabbed a bubble
            if(e.cancelable) e.preventDefault(); 
            break;
        }
    }
}

function handleMove(e) {
    if (draggedIdea) {
        if(e.cancelable) e.preventDefault(); // Stop screen from pulling while dragging
        const pos = getPointerPos(e);
        draggedIdea.x = pos.x;
        draggedIdea.y = pos.y;
    }
}

async function handleEnd(e) {
    if (draggedIdea) {
        draggedIdea.isDragging = false;

        // Check if we dropped it onto another bubble!
        for (let i = 0; i < ideas.length; i++) {
            const targetIdea = ideas[i];
            
            if (targetIdea !== draggedIdea) {
                const dist = Math.hypot(draggedIdea.x - targetIdea.x, draggedIdea.y - targetIdea.y);
                
                // Collision! Target swallows Dragged
                if (dist < targetIdea.radius + draggedIdea.radius) {
                    
                    // --- THE ANTI-INCEPTION GUARD ---
                    // If the dragged idea has children, it is a parent! 
                    // We immediately break out of this loop so it bounces off instead of merging.
                    if (draggedIdea.children && draggedIdea.children.length > 0) {
                        break; 
                    }
                    
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
                        console.error("Failed to merge in database", err);
                    }
                    
                    break; 
                }
            }
        }
        draggedIdea = null;
    }
}

// Attach listeners for Mouse
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

// Attach listeners for Touch (Passive: false allows us to use e.preventDefault() to stop scrolling)
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);
canvas.addEventListener('touchcancel', handleEnd); // In case a phone call interrupts the drag!

// --- Database Interaction (Ideas API) ---

async function loadIdeas() {
    try {
        const response = await fetch('/api/ideas'); 
        
        if (!response.ok) throw new Error("Backend not ready yet");
        
        const data = await response.json();
        
        data.forEach(item => {
            const newParent = new IdeaNode(item.id, item.text, width/2, height/2 + 50, item.color, item.priority, ctx);
            
            // PRE-ABSORB CHILDREN: If this idea has lava inside it from the database, load it in!
            if (item.children && item.children.length > 0) {
                item.children.forEach(child => {
                    newParent.absorb(child);
                });
            }
            
            ideas.push(newParent);
        });

        if (ideas.length > 0) {
            hideModal();
        } else {
            showModal(); 
        }

    } catch (error) {
        console.warn("API not connected yet. Running purely in memory.", error);
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

        const newIdeaData = { text, color, priority };

        try {
            const response = await fetch('/api/ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken() 
                },
                body: JSON.stringify(newIdeaData)
            });

            if (!response.ok) throw new Error("Failed to save to database");
            
            const savedItem = await response.json();
            ideas.push(new IdeaNode(savedItem.id, savedItem.text, width/2, height/2 + 50, savedItem.color, savedItem.priority, ctx));
            hideModal();

        } catch (error) {
            console.error(error);
            ideas.push(new IdeaNode(`temp-${Date.now()}`, text, width/2, height/2 + 50, color, priority, ctx));
            hideModal();
        } finally {
            submitBtn.innerText = "Add to Atmosphere";
            submitBtn.disabled = false;
        }
    }
});

// --- Boot Sequence ---
loadIdeas();