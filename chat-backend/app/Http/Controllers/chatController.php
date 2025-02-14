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

        Log::info('Received biobot indices: ', $bioBotResponseIds);

        $responses = [];
        
        // Check user's message for biobot triggers
        $lastUserMessage = end($userMessages)['content'] ?? '';
        $biobotResponse = $this->biobotParser($lastUserMessage, $bioBotResponseIds);
        
        // Handle the biobot response content
        if(isSet($biobotResponse['content']) && isSet($biobotResponse['id'])) {
            // Use 'assistant' role for biobot response
            $responses[] = ['role' => 'assistant', 'content' => "[Biobot] " . $biobotResponse['content']];
            // Add the biobot response index to the response array
            $bioBotResponseIds[] = $biobotResponse['id'];
        }

        // Get personality configuration from config file
        $personalityConfig = config('ai_personalities');
        
        // Load context file
        $contextContent = '';
        if (Storage::disk('contexts')->exists("{$personality}.txt")) {
            $contextContent = Storage::disk('contexts')->get("{$personality}.txt");
        }

        // Create a more explicit language instruction
        $languageInstruction = $language === 'en' 
            ? "IMPORTANT: You must respond in English only. This is a strict requirement."
            : "IMPORTANT: Vous devez répondre en français uniquement. C'est une exigence stricte.";

        // Prepare messages for AI
        $aiMessages = [
            [
                'role' => 'system',
                'content' => $languageInstruction . "\n\n" . $personalityConfig['system_message']['content']
            ],
            // Add a language reinforcement message
            [
                'role' => 'system',
                'content' => $language === 'en'
                    ? "Remember: All responses must be in English."
                    : "Rappel: Toutes les réponses doivent être en français."
            ],
            // Introduction message
            [
                'role' => 'assistant',
                'content' => $language === 'en' 
                    ? "Hello, I am Mélisandre's CV. I've come to life in order to represent her."
                    : "Bonjour, je suis le CV de Mélisandre, donné souffle de vie pour la représenter."
            ],
            // Context message provides the reference data
            [
                'role' => 'assistant',
                'content' => "Here is my reference information:\n\n" . $contextContent
            ],
            // User's messages
            ...$userMessages
        ];

        // Log the prepared messages for debugging
 /*        Log::info('Prepared messages for AI', [
            'system_message' => $messages[0]['content'],
            'language_setting' => $language
        ]); */

        // Add biobot response to AI context if there are any
        if (isSet($biobotResponse['content'])) {
            $aiMessages[] = [
                'role' => 'assistant',
                'content' => "[Biobot] " . $biobotResponse['content']
            ];
        }

/*         // Limit the number of messages to avoid large payloads
        $messages = array_slice($messages, -10); */

        $apiKey = $provider === 'openai' 
            ? env('OPENAI_API_KEY') 
            : env('DEEPSEEK_API_KEY');
        
        $apiUrl = $provider === 'openai' ? $this->openaiUrl : $this->deepseekUrl;

        $params = array_merge([
            'model' => $provider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat',
            'messages' => $aiMessages,
            'temperature' => 0.7,  
            'max_tokens' => 100,
        ], $parameters);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->post($apiUrl, $params);

            if (isset($response['choices']) && count($response['choices']) > 0) {
                $aiResponse = $response['choices'][0]['message']['content'];
                $responses[] = ['role' => 'assistant', 'content' => $aiResponse];
            } else {
                Log::error('Unexpected API response structure: ' . json_encode($response->json()));
                return response()->json([
                    'error' => 'Unexpected response from AI provider.'
                ], 500);
            }

            // Check AI response for biobot triggers
            $secondaryBiobotResponse = $this->biobotParser($aiResponse, $bioBotResponseIds);
            if (isSet($secondaryBiobotResponse['content'])) {
                $responses[] = ['role' => 'assistant', 'content' => "[Biobot] " . $secondaryBiobotResponse['content']];
            }

            // Return both messages and updated indices
            return response()->json([
                'messages' => $responses,
                'bioBotResponseIds' => array_merge(
                    $bioBotResponseIds,
                    array_map(fn($resp) => $resp['id'], $secondaryBiobotResponse)
                )
            ]);

        } catch (\Exception $e) {
            Log::error('Chat error: ' . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while processing your request'
            ], 500);
        }
    }

    private function biobotParser($input, $usedIds = [])
    {
        $biobotResponse = [];
        $biographicalBlurts = [
            [
                "id" => 1,
                "keywords" => ["dream"],
                "thought" => "Did you know that dreams have inspired many great inventions?"
            ],
            [
                "id" => 2,
                "keywords" => ["memory"],
                "thought" => "Memories are like echoes of time. Some fade, some remain crystal clear."
            ],
            [
                "id" => 3,
                "keywords" => ["poetry"],
                "thought" => "A thought, a whisper, a fragment of a dream—that is poetry."
            ]
        ];

        // Remove session-related code and use passed in usedIndices
        Log::info('Using biobot indices: ', $usedIds);

        foreach ($biographicalBlurts as $item) {
            // Skip this entire biographical blurt if ID was used
            if (in_array($item['id'], $usedIds)) {
                Log::info('Biobot ID ' . $item['id'] . ' already used');
                continue;
            }

            $keywordFound = false;
            foreach ($item['keywords'] as $keyword) {
                Log::info('Checking keyword: ' . $keyword);
                if (stripos($input, $keyword) !== false) {
                    Log::info('Keyword found in input');
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

    public function testAiPayload(Request $request)
    {
        // Get basic config
        $personalityConfig = config('ai_personalities');
        $personality = $request->input('personality', 'default');
        
        // Debug file path information
        $contextPath = storage_path("app/contexts/{$personality}.txt");
        $fileExists = Storage::disk('contexts')->exists("{$personality}.txt");

        //biobotparser
        $biobotMessages = $this->biobotParser('I have a dream');

        // Merge Biobot messages with the user conversation
        $AImessages = array_merge(['role' => 'biobot', 'content' => 'Hello, who are ...'], $biobotMessages);

        // Try to get context file content
        $contextContent = '';
        if ($fileExists) {
            $contextContent = Storage::disk('contexts')->get("{$personality}.txt");
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
    }
}