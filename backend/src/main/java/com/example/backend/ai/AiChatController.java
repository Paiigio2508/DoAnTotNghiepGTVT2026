package com.example.backend.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-chat")
@CrossOrigin(origins = "http://localhost:5173")
public class AiChatController {

  private final OpenAiService openAiService;

  public AiChatController(OpenAiService openAiService) {
    this.openAiService = openAiService;
  }

  @PostMapping
  public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {
    return ResponseEntity.ok(openAiService.createReply(request));
  }
}
