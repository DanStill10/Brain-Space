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

// Helper to grab Laravel's security token (Still needed for secure local POST requests)
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
canvas.addEventListener('click', () => {
    if (ideas.length > 0 && !modal.classList.contains('hidden-animate')) hideModal();
});

// --- Database Interaction (Ideas API) ---

async function loadIdeas() {
    try {
        const response = await fetch('/api/ideas'); 
        
        if (!response.ok) throw new Error("Backend not ready yet");
        
        const data = await response.json();
        
        data.forEach(item => {
            ideas.push(new IdeaNode(item.id, item.text, width/2, height/2 + 50, item.color, item.priority, ctx));
        });

        if (ideas.length > 0) {
            hideModal();
        } else {
            // Welcome Experience: If the database is completely empty, pop the modal open automatically!
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

// Jump straight to loading ideas, no auth checks needed!
loadIdeas();