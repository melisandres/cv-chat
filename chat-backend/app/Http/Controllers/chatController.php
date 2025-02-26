<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    private $openaiUrl = 'https://api.openai.com/v1/chat/completions';
    private $deepseekUrl = 'https://api.deepseek.ai/v1/chat/completions';


    /* public function chat(Request $request)
    {
        $provider = $request->input('provider', 'openai');
        $personality = $request->input('personality', 'default');
        $userMessages = $request->input('messages', []);
        $parameters = $request->input('parameters', []);
        $language = $request->input('language', 'en');
        $bioBotResponseIds = $request->input('bioBotResponseIds', []);


        $responses = [];

        //HANDLE BIOBOT FIRST RESPONSE WINDOW
        
        // Check user's message for biobot triggers
        $lastUserMessage = end($userMessages)['content'] ?? '';
        $biobotResponse = $this->biobotParser($lastUserMessage, $bioBotResponseIds, $language);
        
        // Handle the biobot response content
        if (isset($biobotResponse['content']) && isset($biobotResponse['id'])) {
            $responses[] = ['role' => 'assistant', 'content' => "[Biobot] " . $biobotResponse['content']];
            $bioBotResponseIds[] = $biobotResponse['id'];
        }

        try {
            //HANDLE PRIMARY AI RESPONSE WINDOW
            $aiMessages = $this->prepareAiMessages($userMessages, $personality, $language, $biobotResponse);
            $aiResponse = $this->cvAi($aiMessages, $provider, $parameters);
            $responses[] = ['role' => 'assistant', 'content' => $aiResponse];

            // HANDLE SECONDARY BIOBOT RESPONSE WINDOW
            // Check AI response for biobot triggers
            $secondaryBiobotResponse = $this->biobotParser($aiResponse, $bioBotResponseIds, $language);
            if (isset($secondaryBiobotResponse['content'])) {
                $responses[] = ['role' => 'assistant', 'content' => "[Biobot] " . $secondaryBiobotResponse['content']];
                // Add the new biobot ID if it exists
                if (isset($secondaryBiobotResponse['id'])) {
                    $bioBotResponseIds[] = $secondaryBiobotResponse['id'];
                }
            }
            
            // Return both messages and updated indices
            return response()->json([
                'messages' => $responses,
                'bioBotResponseIds' => $bioBotResponseIds
            ]);

        } catch (\Exception $e) {
            Log::error('Chat error: ' . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while processing your request'
            ], 500);
        }
    }
 */

    public function biobotResponse(Request $request)
    {
        $input = $request->input('input');
        $bioBotResponseIds = $request->input('bioBotResponseIds', []);
        $language = $request->input('language', 'en');
        $provider = $request->input('provider', 'openai');
        $parameters = $request->input('parameters', []);
        $useAiEnhancement = $request->input('useAiEnhancement', true);

        // Get the raw biobot response
        $biobotResponse = $this->biobotParser($input, $bioBotResponseIds, $language);

        // If we found a match and AI enhancement is enabled
        if ($biobotResponse['found'] && $useAiEnhancement && !empty($biobotResponse['content'])) {
            // Prepare messages for the biobot AI
            $aiMessages = $this->prepareAiMessages(
                [['role' => 'user', 'content' => $biobotResponse['content']]], 
                'default', 
                $language, 
                null, 
                'biobotAi'
            );
            
            // Send to AI for enhancement
            try {
                $enhancedContent = $this->sendQueryToAi($aiMessages, $provider, $parameters);
                $biobotResponse['content'] = $enhancedContent;
            } catch (\Exception $e) {
                Log::error('Biobot AI enhancement error: ' . $e->getMessage());
                // If AI enhancement fails, we'll use the original content (already set)
            }
        }

        // Update the response IDs if we found a match
        if ($biobotResponse['id']) {
            $bioBotResponseIds[] = $biobotResponse['id'];
        }

        // Clean up the response before sending
        $responseData = [
            'biobotResponse' => [
                'id' => $biobotResponse['id'],
                'content' => $biobotResponse['found'] ? $biobotResponse['content'] : ''
            ],
            'bioBotResponseIds' => $bioBotResponseIds
        ];

        return response()->json($responseData);
    }

    public function cvAiResponse(Request $request)
    {
        $messages = $request->input('messages', []);
        $provider = $request->input('provider', 'openai');
        $parameters = $request->input('parameters', []);
        $language = $request->input('language', 'en');

        $aiMessages = $this->prepareAiMessages($messages, 'default', $language);
        $aiResponse = $this->sendQueryToAi($aiMessages, $provider, $parameters);

        return response()->json([
            'aiResponse' => $aiResponse
        ]);
    }
    //TODO: this needs to be cleaned up, so that the prompt parts are clearer, and... this is not for either AI, but really specifically for the cvAI. 
    private function prepareAiMessages($userMessages, $personality, $language, $biobotResponse = null, $aiType = 'cvAi')
    {
        $personalityConfig = config('ai_personalities')[$aiType];
        $languageConfig = $personalityConfig['language_instructions'][$language];
        
        $aiMessages = [
            // System messages
            [
                'role' => 'system',
                'content' => $languageConfig['primary'] . "\n\n" . $personalityConfig['system_message']['content']
            ],
            [
                'role' => 'system',
                'content' => $languageConfig['reminder']
            ],
        ];

        // Add other bot instruction if it exists
        if (isset($personalityConfig['other_bot_instruction'])) {
            $aiMessages[] = [
                'role' => 'system',
                'content' => $personalityConfig['other_bot_instruction']
            ];
        }

        // Add introduction and context for cvAi
        if ($aiType === 'cvAi') {
            // Load context file
            $contextContent = '';
            if (Storage::disk('contexts')->exists("{$personality}_{$language}.txt")) {
                $contextContent = Storage::disk('contexts')->get("{$personality}_{$language}.txt");
            }

            $aiMessages = array_merge($aiMessages, [
                [
                    'role' => 'assistant',
                    'content' => $languageConfig['introduction']
                ],
                [
                    'role' => 'assistant',
                    'content' => "Here is my reference information:\n\n" . $contextContent
                ]
            ]);
        }

        // Add user messages
        $aiMessages = array_merge($aiMessages, $userMessages);

        // Add biobot response if present and if it's cvAi
        if ($aiType === 'cvAi' && isset($biobotResponse['content']) && !empty($biobotResponse['content'])) {
            $aiMessages[] = [
                'role' => 'assistant',
                'content' => "[Biobot] " . $biobotResponse['content']
            ];
        }

        return $aiMessages;
    }

    //TODO: this name is misleading... this is to send AI messages. It might be good to study if this can work with either AI (cvAi or bioBot)
    private function sendQueryToAi($messages, $provider = 'openai', $parameters = [])
    {
        $apiKey = $provider === 'openai' 
            ? env('OPENAI_API_KEY') 
            : env('DEEPSEEK_API_KEY');
        
        $apiUrl = $provider === 'openai' ? $this->openaiUrl : $this->deepseekUrl;

        $params = array_merge([
            'model' => $provider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat',
            'messages' => $messages,
            'temperature' => 0.7,  
            'max_tokens' => 100,
        ], $parameters);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
        ])->post($apiUrl, $params);

        if (!isset($response['choices']) || count($response['choices']) === 0) {
            Log::error('Unexpected API response structure: ' . json_encode($response->json()));
            throw new \Exception('Unexpected response from AI provider.');
        }

        return $response['choices'][0]['message']['content'];
    }

    private function biobotParser($input, $usedIds = [], $language)
    {
        // Load biographical blurts from the JSON file
        $biographicalBlurts = [];
        if (Storage::disk('contexts')->exists('biographical_blurts_' . $language . '.json')) {
            $biographicalBlurts = json_decode(Storage::disk('contexts')->get('biographical_blurts_' . $language . '.json'), true);
        }

        $biobotResponse = [
            'id' => null,
            'content' => '',
            'found' => false  // Add this flag to indicate if a match was found
        ];

        foreach ($biographicalBlurts as $item) {
            // Skip this entire biographical blurt if ID was used
            if (in_array($item['id'], $usedIds)) {
                continue;
            }

            foreach ($item['keywords'] as $keyword) {
                if (stripos($input, $keyword) !== false) {
                    $biobotResponse = [
                        'id' => $item['id'],
                        'content' => $item['thought'],
                        'found' => true  // Set to true when we find a match
                    ];
                    break 2;  // Break out of both loops
                }
            }
        }
        return $biobotResponse;
    }



    public function testAiPayload()
    {
        try {
            // Test basic environment variables
            $envTest = [
                'app_url' => env('APP_URL'),
                'cors_allowed_origins' => env('CORS_ALLOWED_ORIGINS'),
                'sanctum_stateful_domains' => env('SANCTUM_STATEFUL_DOMAINS'),
            ];

            // Test file paths
            $pathTest = [
                'storage_path' => storage_path(),
                'public_path' => public_path(),
                'base_path' => base_path(),
            ];

            // Test route configuration
            $routeTest = [
                'current_url' => request()->fullUrl(),
                'base_url' => url('/'),
                'is_https' => request()->secure(),
            ];

            return response()->json([
                'status' => 'success',
                'message' => 'Test endpoint reached successfully',
                'environment' => $envTest,
                'paths' => $pathTest,
                'route' => $routeTest,
                'headers' => request()->headers->all(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
}