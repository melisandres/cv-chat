<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;

// Define specific routes first
Route::get('/test', [ChatController::class, 'testAiPayload']);
Route::get('/routes-test', function() {
    return response()->json([
        'message' => 'API routes are working',
        'registered_routes' => collect(Route::getRoutes())->map(function($route) {
            return [
                'uri' => $route->uri(),
                'methods' => $route->methods(),
            ];
        })->toArray()
    ]);
});

Route::post('/chat', [ChatController::class, 'chat']);
Route::post('/biobot-response', [ChatController::class, 'biobotResponse']);
Route::post('/cvai-response', [ChatController::class, 'cvAiResponse']);

// Catch-all route MUST be last
Route::any('{any}', function () {
    return response()->json([
        'request_info' => [
            'path' => request()->path(),
            'url' => request()->url(),
            'full_url' => request()->fullUrl(),
            'method' => request()->method(),
            'prefix' => request()->route('any')
        ]
    ]);
})->where('any', '.*')->name('catch-all');

/* Route::middleware(['web'])->group(function () {
    Route::post('/chat', [ChatController::class, 'chat']);
    // other routes...
}); */