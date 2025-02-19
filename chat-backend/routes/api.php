<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;

Route::post('/chat', [ChatController::class, 'chat']);
Route::get('/test-ai-payload', [ChatController::class, 'testAiPayload']);
Route::post('/biobot-response', [ChatController::class, 'biobotResponse']);
Route::post('/cvai-response', [ChatController::class, 'cvAiResponse']);

/* Route::middleware(['web'])->group(function () {
    Route::post('/chat', [ChatController::class, 'chat']);
    // other routes...
}); */