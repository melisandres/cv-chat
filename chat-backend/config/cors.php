<?php

return [
    'paths' => ['api/*'],
    'allowed_origins' => ['https://melisandres.github.io', 'http://localhost:3000'],
    'allowed_methods' => ['*'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
    'paths' => ['*'],  // This allows all paths
    'allowed_origins' => ['*'],  // For testing, allow all origins
];