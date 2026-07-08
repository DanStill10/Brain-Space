<?php

use App\Http\Controllers\IdeaController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('atmosphere');
})->name('dashboard');

// Default dashboard route removed to use atmosphere as main dashboard

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/api/ideas', [IdeaController::class, 'index']);
    Route::get('/api/ideas/{idea}', [IdeaController::class, 'show']);
    Route::post('/api/ideas', [IdeaController::class, 'store']);
    Route::put('/api/ideas/{idea}', [IdeaController::class, 'update']);
    Route::put('/api/ideas/{idea}/rescue', [IdeaController::class, 'rescue']);
    Route::put('/api/ideas/{idea}/complete', [IdeaController::class, 'complete']);
    Route::delete('/api/ideas/{idea}', [IdeaController::class, 'destroy']);
    Route::post('/api/ideas/{idea}/updates', [IdeaController::class, 'storeUpdate']);
    Route::delete('/api/ideas/{idea}/updates/{update}', [IdeaController::class, 'destroyUpdate']);
});

require __DIR__.'/auth.php';
