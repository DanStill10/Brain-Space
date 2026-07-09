<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="auth-check" content="{{ auth()->check() ? 'true' : 'false' }}">
    <title>Brain Space</title>
    
    @vite(['resources/css/app.css', 'resources/js/atmosphere.js'])
</head>
<body>

    <canvas id="atmosphere"></canvas>

    <div id="ui-layer">
        
        <!-- Mission Report Card -->
        <div id="mission-report" class="opacity-0 pointer-events-none -translate-y-1/2 translate-x-[-20px]">

            <div class="report-content">

                <div id="report-header">
                    <div class="report-label-group">
                        <div class="report-label">Object Identification</div>
                        <h1 id="report-title">--</h1>
                    </div>
                    
                    <div id="report-specs">
                        <div>
                            <div class="spec-label">Priority Index</div>
                            <div id="report-priority">0.0</div>
                        </div>
                        <div>
                            <div class="spec-label">Status</div>
                            <div id="report-status">Stable</div>
                        </div>
                    </div>

                    <div id="report-composition">
                        <div class="spec-label">Composition</div>
                        <div id="report-children">No sub-modules detected.</div>
                    </div>
                </div>

                <div id="report-updates">
                    <div class="empty-state">No updates yet.</div>
                </div>

                <div id="report-action">
                    <button id="add-update-btn">+ Log Update</button>
                </div>
            </div>
        </div>

        <!-- The Black Hole (Trash/Completion) -->
        <div id="black-hole">
            <div class="bh-core"></div>
            <div class="bh-ring"></div>
            <div class="bh-event-horizon"></div>
            <span class="bh-label">Void</span>
        </div>

        <!-- The Escape Hatch -->
        <button type="button" id="back-btn" class="hidden">← Back to Atmosphere</button>

        <!-- Modal Overlay -->
        <div id="modal-overlay" class="hidden-animate"></div>

        <!-- Goal Modal -->
        <div id="goal-modal" class="modal hidden-animate w-11/12 max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl text-white absolute inset-0 m-auto">
            <h2 class="text-xl sm:text-2xl font-semibold mb-2 tracking-tight">What's a goal of yours right now?</h2>
            <p class="text-slate-400 text-sm mb-6">Drop a new idea into your atmosphere.</p>
            
            <form id="goal-form">
                <input 
                    type="text" 
                    id="goal-input" 
                    class="form-input"
                    placeholder="e.g., Learn to play piano..."
                    autocomplete="off"
                    required
                >

                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
                    <div class="flex-1">
                        <label class="block text-xs text-slate-400 mb-1">Color Theme</label>
                        <select id="goal-color" class="form-input">
                            <option value="">Random</option>
                            <option value="blue">Blue</option>
                            <option value="emerald">Emerald</option>
                            <option value="violet">Violet</option>
                            <option value="amber">Amber</option>
                            <option value="rose">Rose</option>
                            <option value="indigo">Indigo</option>
                            <option value="cyan">Cyan</option>
                            <option value="teal">Teal</option>
                            <option value="lime">Lime</option>
                            <option value="yellow">Yellow</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                            <option value="pink">Pink</option>
                            <option value="gold">Gold</option>
                            <option value="slate">Slate</option>
                        </select>
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs text-slate-400 mb-1">Priority</label>
                        <select id="goal-priority" class="form-input">
                            <option value="0">0 - Lowest</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5 - Highest</option>
                        </select>
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <button type="button" id="cancel-btn" class="btn-ghost hidden">
                        Cancel
                    </button>
                    <button type="submit" id="submit-btn" class="btn-primary">
                        Add to Atmosphere
                    </button>
                </div>
            </form>
        </div>

        <!-- Update Modal -->
        <div id="update-modal" class="modal hidden-animate w-11/12 max-w-lg rounded-2xl p-6 shadow-2xl text-white absolute inset-0 m-auto z-[300]">
            <h2 class="text-xl font-semibold mb-2 tracking-tight">General Update</h2>
            <p class="text-slate-400 text-sm mb-4">Log a note or attach an image for this idea.</p>
            
            <textarea id="update-content" 
                      class="form-input"
                      rows="4"
                      placeholder="What's new with this idea?"></textarea>
            
            <div class="flex items-center gap-3 mt-4">
                <input type="file" id="update-media" accept="image/*" hidden>
                <button type="button" id="attach-btn" 
                        class="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-lg">
                    📎
                </button>
                <span id="attach-filename" class="text-xs text-slate-400 truncate"></span>
            </div>
            
            <div class="mt-6 flex justify-end gap-3">
                <button type="button" id="cancel-update" class="btn-ghost">
                    Cancel
                </button>
                <button type="button" id="submit-update" class="btn-primary">
                    Log Update
                </button>
            </div>
        </div>

        <button id="add-btn" class="hidden">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
        </button>

        <!-- Auth Modal -->
        <div id="auth-modal" class="modal hidden-animate w-11/12 max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl text-white absolute inset-0 m-auto z-[200]">
            <h2 id="auth-title" class="text-xl sm:text-2xl font-semibold mb-2 tracking-tight">Access Your Brain Space</h2>
            <p id="auth-subtitle" class="text-slate-400 text-sm mb-6">Log in or create an account to stabilize your atmosphere.</p>
            
            <form id="auth-form">
                <div id="auth-name-group" class="hidden mb-4">
                    <input type="text" id="auth-name" class="form-input" placeholder="Name">
                </div>
                <div class="mb-4">
                    <input type="email" id="auth-email" class="form-input" placeholder="Email" required>
                </div>
                <div class="mb-6">
                    <input type="password" id="auth-password" class="form-input" placeholder="Password" required>
                </div>
                <div id="auth-confirm-group" class="hidden mb-6">
                    <input type="password" id="auth-password-confirm" class="form-input" placeholder="Confirm Password">
                </div>

                <div class="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                    <button type="button" id="auth-toggle-btn" class="auth-toggle">Need an account? Register</button>
                    <button type="submit" id="auth-submit-btn" class="btn-primary w-full sm:w-auto">Log In</button>
                </div>
            </form>
        </div>

        <button type="button" id="logout-btn" class="{{ auth()->check() ? '' : 'hidden' }}">
            Disconnect
        </button>

    </div>
</body>
</html>
