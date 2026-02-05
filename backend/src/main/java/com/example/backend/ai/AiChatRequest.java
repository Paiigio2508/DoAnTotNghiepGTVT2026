package com.example.backend.ai;

import java.util.List;

public record AiChatRequest(String message, List<ChatMessage> history) {}
