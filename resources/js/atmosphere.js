import { Particle } from './models/Particle.js';
import { IdeaNode } from './models/IdeaNode.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global State ---
const canvas = document.getElementById('atmosphere');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('goal-modal');
const form = document.getElementById('goal-form');
const input = document.getElementById('goal-input');
const colorInput = document.getElementById('goal-color');
const priorityInput = document.getElementById('goal-priority');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const statusDisplay = document.getElementById('user-id-display');

let width, height;
let ideas = [];
let ambientParticles = [];
let currentUser = null;

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
    for(let i=0; i<150; i++) {
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

// --- Firebase Configuration ---
// Note: In production, these should be loaded from your .env variables via Vite
const firebaseConfig = { /* Your config here */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// Form Submission -> Database
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const color = colorInput.value;
    const priority = parseInt(priorityInput.value) || 0;
    const submitBtn = document.getElementById('submit-btn');
    
    if (text && currentUser) {
        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;

        try {
            const ideasRef = collection(db, 'artifacts', 'default-app-id', 'users', currentUser.uid, 'ideas');
            await addDoc(ideasRef, { text, color, priority, createdAt: Date.now() });
            hideModal();
            submitBtn.innerText = "Add to Atmosphere";
            submitBtn.disabled = false;
        } catch (error) {
            submitBtn.innerText = "Error Saving!";
            submitBtn.classList.replace('bg-blue-500', 'bg-red-500');
            submitBtn.classList.replace('hover:bg-blue-400', 'hover:bg-red-400');
            setTimeout(() => {
                submitBtn.innerText = "Add to Atmosphere";
                submitBtn.classList.replace('bg-red-500', 'bg-blue-500');
                submitBtn.classList.replace('hover:bg-red-400', 'hover:bg-blue-400');
                submitBtn.disabled = false;
            }, 3000);
        } 
    }
});

// --- Auth & Database Sync Listener ---
const initAuth = async () => {
    try { await signInAnonymously(auth); } 
    catch (err) { statusDisplay.innerText = "Auth Error"; }
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        statusDisplay.innerText = `Synced (User: ${user.uid.substring(0,6)}...)`;
        const ideasRef = collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'ideas');
        
        onSnapshot(ideasRef, (snapshot) => {
            const fetchedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            fetchedDocs.forEach(data => {
                if (!ideas.find(i => i.id === data.id)) {
                    ideas.push(new IdeaNode(data.id, data.text, width/2, height/2 + 50, data.color, data.priority, ctx));
                }
            });

            ideas = ideas.filter(idea => fetchedDocs.find(d => d.id === idea.id));

            if (ideas.length > 0) {
                hideModal();
            } else if (modal.classList.contains('hidden-animate')) {
                showModal();
                cancelBtn.classList.add('hidden');
            }
        });
    }
});

// Start System
initAuth();
input.focus();
animate();