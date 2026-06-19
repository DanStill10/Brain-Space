<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\IdeaController;

/**
 * --------------------------------------------------------------------------
 * Web Routes (The "Front Door" of Our Application)
 * --------------------------------------------------------------------------
 * 
 * Think of this file as the application's receptionist or switchboard. 
 * Why do we define these here? Because it creates a clear, centralized map of every 
 * possible URL endpoint our application supports.
 * 
 * When a user makes an HTTP request (like a GET or POST), Laravel looks here first to 
 * figure out where to send that traffic. We are mapping URLs (like '/api/ideas') 
 * directly to the Controller methods that know how to handle them.
 */

Route::get('/', function () {
    return view('atmosphere');
});

// No more middleware!
Route::get('/api/ideas', [IdeaController::class, 'index']);
Route::post('/api/ideas', [IdeaController::class, 'store']);
Route::put('/api/ideas/{idea}', [IdeaController::class, 'update']);
Route::put('/api/ideas/{idea}/rescue', [IdeaController::class, 'rescue']);
Route::put('/api/ideas/{idea}/complete', [IdeaController::class, 'complete']);
Route::delete('/api/ideas/{idea}', [IdeaController::class, 'destroy']);