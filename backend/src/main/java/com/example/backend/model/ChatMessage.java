package com.example.backend.model;

public class ChatMessage {
  private String sender;
  private String recipient;
  private String content;
  private String timestamp;

  public ChatMessage() {}

  public ChatMessage(String sender, String recipient, String content, String timestamp) {
    this.sender = sender;
    this.recipient = recipient;
    this.content = content;
    this.timestamp = timestamp;
  }

  public String getSender() {
    return sender;
  }

  public void setSender(String sender) {
    this.sender = sender;
  }

  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }
}
