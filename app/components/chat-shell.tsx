"use client";

import { useLLMSetup } from "@/hooks/use-llm-setup";
import { STORAGE_KEYS } from "@/lib/browser/model-setup";
import { RobotOutlined, SendOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import styles from "./chat-shell.module.css";

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

interface GenerationSettings {
  defaultModelId: string;
  maxTokens: number;
  temperature: number;
  jsonMode: boolean;
}

export function ChatShell() {
  const { loadedModelId, models } = useLLMSetup();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [form] = Form.useForm<GenerationSettings>();

  const loadedModel = useMemo(
    () => models.find((model) => model.id === loadedModelId) ?? null,
    [loadedModelId, models],
  );

  const downloadedModels = useMemo(
    () => models.filter((model) => model.downloaded),
    [models]
  );

  useEffect(() => {
    if (isSettingsOpen) {
      const raw = window.localStorage.getItem(STORAGE_KEYS.generationSettings);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as GenerationSettings;
          form.setFieldsValue(parsed);
          return;
        } catch {
          // ignore
        }
      }

      form.setFieldsValue({
        defaultModelId: downloadedModels[0]?.id,
        maxTokens: 512,
        temperature: 0.7,
        jsonMode: false,
      });
    }
  }, [isSettingsOpen, downloadedModels, form]);

  function onSaveSettings(values: GenerationSettings) {
    window.localStorage.setItem(STORAGE_KEYS.generationSettings, JSON.stringify(values));
    setIsSettingsOpen(false);
  }

  const canSend = Boolean(loadedModelId && prompt.trim().length > 0 && !isGenerating);

  async function sendPrompt() {
    if (!canSend) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: prompt.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsGenerating(true);

    try {
      const savedSettings = (() => {
        if (typeof window === "undefined") {
          return null;
        }

        const raw = window.localStorage.getItem(STORAGE_KEYS.generationSettings);
        if (!raw) {
          return null;
        }

        try {
          return JSON.parse(raw) as GenerationSettings;
        } catch {
          return null;
        }
      })();

      // Create a placeholder assistant message
      const assistantId = `${Date.now()}-a`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ]);

      if (loadedModel?.source?.provider === "webllm") {
        const { generateStreamWithWebLLM, ensureWebLLMModelLoaded } = await import("@/lib/browser/webllm-engine");

        if (loadedModelId) {
          await ensureWebLLMModelLoaded(loadedModelId);
        }

        const inputForModel = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

        const stream = generateStreamWithWebLLM(inputForModel, {
          maxTokens: savedSettings?.maxTokens ?? 256,
          temperature: savedSettings?.temperature ?? 0.7,
        });

        let fullContent = "";
        for await (const chunk of stream) {
          fullContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: fullContent } : msg
            )
          );
        }
      } else {
        // Fallback or API mode
        const response = await fetch("/api/v1/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userMessage.content,
            max_tokens: savedSettings?.maxTokens ?? 256,
            temperature: savedSettings?.temperature ?? 0.7,
            json_mode: savedSettings?.jsonMode ?? false,
          }),
        });

        const payload = (await response.json()) as {
          success: boolean;
          data?: { text: string };
          error?: { message: string };
        };
        const assistantText = payload.success ? payload.data?.text ?? "" : payload.error?.message ?? "Generation failed";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: assistantText } : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Avatar
            size={40}
            icon={<RobotOutlined />}
            className={styles.headerAvatar}
          />
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 18 }}>
              AI Assistant
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {loadedModelId ? (
                <Badge status="success" text={`${loadedModel?.name || loadedModelId} • Online`} />
              ) : (
                <Badge status="default" text="No model loaded" />
              )}
            </Text>
          </div>
        </div>
        <Space size={8}>
          <Tooltip title="Settings">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setIsSettingsOpen(true)}
              type="text"
              size="large"
            />
          </Tooltip>
        </Space>
      </div>

      {/* Messages Area */}
      <div className={styles.messagesContainer}>
        <div className={styles.messagesInner}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <Empty
                description={
                  <Space direction="vertical" size={8}>
                    <Text style={{ fontSize: 16 }}>Start a conversation</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {loadedModelId
                        ? "Ask me anything!"
                        : "Please load a model first from Configuration"}
                    </Text>
                  </Space>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${message.role === "user" ? styles.messageRowUser : styles.messageRowAssistant
                    }`}
                >
                  {message.role === "assistant" && (
                    <Avatar
                      size={32}
                      icon={<RobotOutlined />}
                      className={styles.messageAvatar}
                      style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
                    />
                  )}

                  <div className={styles.messageBubbleWrapper}>
                    <div
                      className={`${styles.messageBubble} ${message.role === "user" ? styles.userBubble : styles.assistantBubble
                        }`}
                    >
                      <div className={styles.messageContent}>
                        {message.content || (
                          <span className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <Avatar
                      size={32}
                      icon={<UserOutlined />}
                      className={styles.messageAvatar}
                      style={{ background: '#475569' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className={styles.inputContainer}>
        {!loadedModelId && (
          <Alert
            type="warning"
            showIcon
            message="No model loaded"
            description="Go to Configuration to download and load a model first."
            style={{ marginBottom: 12 }}
          />
        )}

        <div className={styles.inputWrapper}>
          <TextArea
            className={styles.inputArea}
            placeholder={loadedModelId ? "Type your message..." : "Load a model first..."}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey && canSend) {
                e.preventDefault();
                sendPrompt();
              }
            }}
            disabled={!loadedModelId || isGenerating}
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
          <Tooltip title={canSend ? "Send message (Enter)" : "Type a message"}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!canSend}
              loading={isGenerating}
              onClick={sendPrompt}
              className={styles.sendButton}
              size="large"
            />
          </Tooltip>
        </div>

        <div className={styles.inputHelper}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Press <Text keyboard style={{ fontSize: 11 }}>Enter</Text> to send, <Text keyboard style={{ fontSize: 11 }}>Shift + Enter</Text> for new line
          </Text>
        </div>
      </div>

      {/* Settings Drawer */}
      <Drawer
        title={
          <Space>
            <SettingOutlined style={{ color: '#0d9488' }} />
            <span>Chat Settings</span>
          </Space>
        }
        placement="right"
        onClose={() => setIsSettingsOpen(false)}
        open={isSettingsOpen}
        width={400}
      >
        <Form layout="vertical" form={form} onFinish={onSaveSettings}>
          <Form.Item
            label={<Text strong>Default Model</Text>}
            name="defaultModelId"
            rules={[{ required: true, message: 'Please select a model' }]}
          >
            <Select
              options={downloadedModels.map((model) => ({
                label: `${model.name} (${model.size})`,
                value: model.id,
              }))}
              placeholder="Select downloaded model"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Max Tokens</Text>}
            name="maxTokens"
            rules={[{ required: true }]}
            extra="Maximum number of tokens to generate (1-4096)"
          >
            <InputNumber
              min={1}
              max={4096}
              style={{ width: "100%" }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>Temperature</Text>}
            name="temperature"
            rules={[{ required: true }]}
            extra="Higher values make output more random (0-2)"
          >
            <InputNumber
              min={0}
              max={2}
              step={0.1}
              style={{ width: "100%" }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<Text strong>JSON Mode</Text>}
            name="jsonMode"
            valuePropName="checked"
            extra="Force the model to output valid JSON"
          >
            <Switch />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            style={{ width: "100%", marginTop: 16 }}
          >
            Save Settings
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}