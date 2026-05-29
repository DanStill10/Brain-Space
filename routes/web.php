<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\IdeaController;

Route::get('/', function () {
    return view('atmosphere');
});

// No more middleware!
Route::get('/api/ideas', [IdeaController::class, 'index']);
Route::post('/api/ideas', [IdeaController::class, 'store']);
Route::put('/api/ideas/{idea}', [IdeaController::class, 'update']);
Route::put('/api/ideas/{idea}/rescue', [IdeaController::class, 'rescue']);
Route::put('/api/ideas/{idea}/complete', [IdeaController::class, 'complete']);