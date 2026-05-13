<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Brain Space</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    
    @vite(['resources/css/app.css', 'resources/js/atmosphere.js'])
</head>
<body>

    <canvas id="atmosphere"></canvas>

    <div id="ui-layer">

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

    </div>
</body>
</html>