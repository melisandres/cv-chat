<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;

Route::post('/chat', [ChatController::class, 'chat']);
Route::get('/test-ai-payload', [ChatController::class, 'testAiPayload']);

/* Route::middleware(['web'])->group(function () {
    Route::post('/chat', [ChatController::class, 'chat']);
    // other routes...
}); */