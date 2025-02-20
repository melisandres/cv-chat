<?php

return [
    'paths' => ['api/*'],
    'allowed_origins' => [
        'http://localhost:3000',
        'https://melisandres.github.io'
    ],
    'allowed_methods' => ['*'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];