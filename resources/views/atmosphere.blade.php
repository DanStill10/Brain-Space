<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="auth-check" content="{{ auth()->check() ? 'true' : 'false' }}">
    <title>Brain Space</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    
    @vite(['resources/css/app.css', 'resources/js/atmosphere.js'])
</head>
<body>

    <canvas id="atmosphere"></canvas>

    <div id="ui-layer">
        
        <!-- Mission Report Panel (Left Edge) -->
        <div id="mission-report" class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-80 p-8 flex flex-col space-y-4 opacity-0 transition-all duration-500 translate-x-[-20px]">
            <div class="border-l-2 border-blue-500/50 pl-6 space-y-1">
                <div class="text-[10px] font-bold tracking-[0.3em] text-blue-400 uppercase opacity-50">Object Identification</div>
                <h1 id="report-title" class="text-3xl font-light tracking-tight text-white leading-tight">--</h1>
            </div>
            
            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                    <div class="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Priority Index</div>
                    <div id="report-priority" class="text-xl font-mono text-white">0.0</div>
                </div>
                <div>
                    <div class="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Status</div>
                    <div id="report-status" class="text-xl font-mono text-emerald-400">Stable</div>
                </div>
            </div>

            <div class="pt-2">
                <div class="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-2">Composition</div>
                <div id="report-children" class="text-xs font-mono text-slate-400 leading-relaxed whitespace-pre-line">
                    No sub-modules detected.
                </div>
            </div>
        </div>

        <!-- The Black Hole (Trash/Completion) -->
        <div id="black-hole" class="pointer-events-none absolute top-8 right-8 w-24 h-24 flex items-center justify-center transition-all duration-500">
            <div class="bh-core w-12 h-12 bg-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] z-10"></div>
            <div class="bh-ring absolute w-full h-full border-2 border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div class="bh-event-horizon absolute w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
            <span class="absolute z-20 text-[11px] font-black tracking-[0.2em] text-black uppercase opacity-0 transition-opacity bh-label" style="text-shadow: 0 0 10px #fff, 0 0 15px #fff, 0 0 20px #fff, 0 0 25px #fff;">Void</span>
        </div>

        <!-- The Escape Hatch (Moved OUTSIDE the modal!) -->
        <button type="button" id="back-btn" class="hidden pointer-events-auto absolute top-4 left-4 bg-slate-800 border-2 border-slate-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-[100] transition-all hover:bg-slate-700">
            ← Back to Atmosphere
        </button>

        <div id="goal-modal" class="modal w-11/12 max-w-md rounded-2xl p-6 shadow-2xl text-white">
            <h2 class="text-2xl font-semibold mb-2 tracking-tight">What's a goal of yours right now?</h2>
            <p class="text-slate-400 text-sm mb-6">Drop a new idea into your atmosphere.</p>
            
            <form id="goal-form">
                <input 
                    type="text" 
                    id="goal-input" 
                    class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                    placeholder="e.g., Learn to play piano..."
                    autocomplete="off"
                    required
                >

                <div class="flex space-x-4 mt-4">
                    <div class="flex-1">
                        <label class="block text-xs text-slate-400 mb-1">Color Theme</label>
                        <select id="goal-color" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors">
                            <option value="">Random</option>
                            <option value="blue">Blue</option>
                            <option value="emerald">Emerald</option>
                            <option value="violet">Violet</option>
                            <option value="amber">Amber</option>
                            <option value="rose">Rose</option>
                        </select>
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs text-slate-400 mb-1">Priority</label>
                        <select id="goal-priority" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors">
                            <option value="0">0 - Lowest</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5 - Highest</option>
                        </select>
                    </div>
                </div>

                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-btn" class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors hidden">
                        Cancel
                    </button>
                    <button type="submit" id="submit-btn" class="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg shadow transition-colors">
                        Add to Atmosphere
                    </button>
                </div>
            </form>
        </div>

        <button id="add-btn" class="hidden w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white focus:outline-none hover:bg-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
        </button>

        <div id="auth-modal" class="modal w-11/12 max-w-md rounded-2xl p-6 shadow-2xl text-white hidden-animate absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200]">
            <h2 id="auth-title" class="text-2xl font-semibold mb-2 tracking-tight">Access Your Brain Space</h2>
            <p id="auth-subtitle" class="text-slate-400 text-sm mb-6">Log in or create an account to stabilize your atmosphere.</p>
            
            <form id="auth-form">
                <div id="auth-name-group" class="hidden mb-4">
                    <input type="text" id="auth-name" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors" placeholder="Name">
                </div>
                <div class="mb-4">
                    <input type="email" id="auth-email" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors" placeholder="Email" required>
                </div>
                <div class="mb-6">
                    <input type="password" id="auth-password" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors" placeholder="Password" required>
                </div>
                <div id="auth-confirm-group" class="hidden mb-6">
                    <input type="password" id="auth-password-confirm" class="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors" placeholder="Confirm Password">
                </div>

                <div class="flex justify-between items-center">
                    <button type="button" id="auth-toggle-btn" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Need an account? Register</button>
                    <button type="submit" id="auth-submit-btn" class="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg shadow transition-colors">Log In</button>
                </div>
            </form>
        </div>

        <button type="button" id="logout-btn" class="{{ auth()->check() ? '' : 'hidden' }} pointer-events-auto absolute bottom-4 left-4 text-slate-500 hover:text-rose-400 text-[10px] font-black tracking-[0.2em] uppercase transition-colors z-[100]">
            Disconnect
        </button>

    </div>
</body>
</html>