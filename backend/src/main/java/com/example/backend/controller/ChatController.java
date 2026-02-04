package com.example.backend.controller;

import com.example.backend.model.ChatMessage;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {
  private final SimpMessagingTemplate messagingTemplate;

  public ChatController(SimpMessagingTemplate messagingTemplate) {
    this.messagingTemplate = messagingTemplate;
  }

  @MessageMapping("/chat")
  public void sendMessage(ChatMessage message) {
    String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    ChatMessage enriched = new ChatMessage(
        message.getSender(),
        message.getRecipient(),
        message.getContent(),
        timestamp
    );
    messagingTemplate.convertAndSend("/topic/messages/" + message.getRecipient(), enriched);
    messagingTemplate.convertAndSend("/topic/messages/" + message.getSender(), enriched);
  }
}
