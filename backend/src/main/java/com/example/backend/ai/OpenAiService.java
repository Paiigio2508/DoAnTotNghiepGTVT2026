package com.example.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OpenAiService {

  private static final URI OPENAI_URI = URI.create("https://api.openai.com/v1/chat/completions");
  private static final String SYSTEM_PROMPT =
      "Bạn là AMI của PTIT. Trả lời ngắn gọn, lịch sự, ưu tiên thông tin học vụ, "
          + "dịch vụ sinh viên, và hướng dẫn thủ tục. Nếu thiếu dữ liệu, hãy hỏi lại.";

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String apiKey;

  public OpenAiService(ObjectMapper objectMapper, @Value("${openai.api.key}") String apiKey) {
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
  }

  public AiChatResponse createReply(AiChatRequest request) {
    if (apiKey == null || apiKey.isBlank()) {
      return new AiChatResponse("AMI chưa được cấu hình API key. Vui lòng liên hệ quản trị.");
    }

    try {
      String payload = buildPayload(request);
      HttpRequest httpRequest =
          HttpRequest.newBuilder()
              .uri(OPENAI_URI)
              .timeout(Duration.ofSeconds(30))
              .header("Authorization", "Bearer " + apiKey)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload))
              .build();

      HttpResponse<String> response =
          httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 400) {
        return new AiChatResponse("AMI đang bận, vui lòng thử lại sau.");
      }

      JsonNode root = objectMapper.readTree(response.body());
      JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
      String reply =
          contentNode.isMissingNode() ? "AMI chưa thể trả lời lúc này." : contentNode.asText();
      return new AiChatResponse(reply.trim());
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      return new AiChatResponse("AMI gặp lỗi kết nối. Vui lòng thử lại.");
    } catch (IOException ex) {
      return new AiChatResponse("AMI gặp lỗi kết nối. Vui lòng thử lại.");
    }
  }

  private String buildPayload(AiChatRequest request) throws IOException {
    List<Map<String, String>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));

    if (request.history() != null) {
      request.history().stream()
          .limit(8)
          .forEach(
              entry ->
                  messages.add(
                      Map.of(
                          "role",
                          entry.role() == null ? "user" : entry.role(),
                          "content",
                          entry.content() == null ? "" : entry.content())));
    }

    messages.add(
        Map.of("role", "user", "content", request.message() == null ? "" : request.message()));

    Map<String, Object> body =
        Map.of(
            "model",
            "gpt-4o-mini",
            "temperature",
            0.3,
            "messages",
            messages);

    return objectMapper.writeValueAsString(body);
  }
}
