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


    public function chat(Request $request)
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
        if(isSet($biobotResponse['content']) && isSet($biobotResponse['id'])) {
            // Use 'assistant' role for biobot response
            $responses[] = ['role' => 'assistant', 'content' => "[Biobot] " . $biobotResponse['content']];
            // Add the biobot response index to the response array
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

        // Add biobot instruction only for cvAi
        if ($aiType === 'cvAi' && isset($personalityConfig['biobot_instruction'])) {
            $aiMessages[] = [
                'role' => 'system',
                'content' => $personalityConfig['biobot_instruction']
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
        if ($aiType === 'cvAi' && isset($biobotResponse['content'])) {
            $aiMessages[] = [
                'role' => 'assistant',
                'content' => "[Biobot] " . $biobotResponse['content']
            ];
        }

        return $aiMessages;
    }

    private function cvAi($messages, $provider = 'openai', $parameters = [])
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
        /* Log::info('Biographical blurts: ', $biographicalBlurts); */

        $biobotResponse = [];
        /* Log::info('Using biobot indices: ', $usedIds); */

        foreach ($biographicalBlurts as $item) {
            // Skip this entire biographical blurt if ID was used
            if (in_array($item['id'], $usedIds)) {
                /* Log::info('Biobot ID ' . $item['id'] . ' already used'); */
                continue;
            }

            $keywordFound = false;
            foreach ($item['keywords'] as $keyword) {
                /* Log::info('Checking keyword: ' . $keyword); */
                if (stripos($input, $keyword) !== false) {
                    /* Log::info('Keyword found in input'); */
                    $biobotResponse = [
                        'id' => $item['id'],
                        'content' => $item['thought']
                    ];
                    $keywordFound = true;
                    break;
                }
            }
            
            if ($keywordFound) {
                break;
            }
        }
        return $biobotResponse;
    }

    /* public function testAiPayload(Request $request)
    {
        // Get basic config
        $personalityConfig = config('ai_personalities');
        $personality = $request->input('personality', 'default');
        
        // Debug file path information
        $contextPath = storage_path("app/contexts/{$personality}_{'en'}.txt");
        $fileExists = Storage::disk('contexts')->exists("{$personality}_{'en'}.txt");

        //biobotparser
        $biobotMessages = $this->biobotParser('I have a dream', [], 'en');

        // Merge Biobot messages with the user conversation
        $AImessages = array_merge(['role' => 'biobot', 'content' => 'Hello, who are ...'], $biobotMessages);

        // Try to get context file content
        $contextContent = '';
        if ($fileExists) {
            $contextContent = Storage::disk('contexts')->get("{$personality}_{'en'}.txt");
        }

        // Create system message with context
        $systemMessage = $personalityConfig['system_message'];
        if ($contextContent) {
            $systemMessage['content'] .= "\n\nAdditional Context:\n" . $contextContent;
        }

        // Create test message array
        $messages = [
            $systemMessage,
            ['role' => 'user', 'content' => $AImessages]
        ];

        // Create the full payload that would be sent to OpenAI
        $payload = [
            'model' => 'gpt-3.5-turbo',
            'messages' => $messages,
            'temperature' => $personalityConfig['parameters']['temperature'],
            'max_tokens' => $personalityConfig['parameters']['max_tokens']
        ];

        // Return the payload for inspection with debug info
        return response()->json([
            'full_payload' => $payload,
            'system_message_only' => $systemMessage,
            'context_file_content' => $contextContent,
            'personality_config' => $personalityConfig,
            'debug' => [
                'personality' => $personality,
                'full_context_path' => $contextPath,
                'file_exists' => $fileExists,
                'storage_path' => storage_path(),
                'contextsStorage_exists' => is_dir(storage_path('app/contexts')),
                'raw_file_exists' => file_exists($contextPath),
                'storage_disk_contents' => Storage::disk('contexts')->files(),
                'storage_directories' => Storage::disk('contexts')->directories(),
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } */
}