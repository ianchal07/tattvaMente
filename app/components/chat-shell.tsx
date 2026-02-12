"use client";

import { SendOutlined, SettingOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { generateWithWebLLM } from "@/lib/browser/webllm-engine";
import { STORAGE_KEYS } from "@/lib/browser/model-setup";
import { useLLMSetup } from "@/hooks/use-llm-setup";
import styles from "./chat-shell.module.css";

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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

  const metrics = useMemo(
    () => [
      { label: "Messages", value: messages.length, suffix: "" },
      { label: "Latency", value: 0, suffix: "ms" },
      { label: "Loaded", value: loadedModelId ? 1 : 0, suffix: "model" },
    ],
    [loadedModelId, messages.length],
  );

  const canSend = Boolean(loadedModelId && prompt.trim().length > 0 && !isGenerating);

  async function sendPrompt() {
    if (!canSend) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: prompt.trim(),
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
        },
      ]);

      if (loadedModel?.source?.provider === "webllm") {
        const { generateStreamWithWebLLM, ensureWebLLMModelLoaded } = await import("@/lib/browser/webllm-engine");

        if (loadedModelId) {
          await ensureWebLLMModelLoaded(loadedModelId);
        }

        // Prepare conversation history
        const history = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const stream = generateStreamWithWebLLM(history, {
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

  return (
    <div className={styles.chatContainer}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            Chat
          </Title>
          <Paragraph type="secondary">Main conversation workspace and local model interaction.</Paragraph>
        </div>
        <Button icon={<SettingOutlined />} onClick={() => setIsSettingsOpen(true)}>
          Settings
        </Button>
      </div>

      {!loadedModelId ? (
        <Alert
          type="warning"
          showIcon
          title="No model loaded"
          description="Go to Configuration and complete download + load before chatting."
        />
      ) : (
        <Alert type="success" showIcon title={`Loaded model: ${loadedModelId}`} />
      )}

      <Row gutter={[12, 12]}>
        {metrics.map((metric) => (
          <Col xs={24} md={8} key={metric.label}>
            <Card size="small" className={styles.metricCard}>
              <Statistic title={metric.label} value={metric.value} suffix={metric.suffix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className={styles.chatPanel}>
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <Empty description="Start a conversation" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageBubble} ${message.role === "user" ? styles.userBubble : styles.assistantBubble
                    }`}
                >
                  <Text strong>{message.role === "user" ? "You" : "Assistant"}</Text>
                  <div>{message.content}</div>
                </div>
              ))}
            </Space>
          )}
        </div>

        <div className={styles.inputRow}>
          <TextArea
            className={styles.input}
            placeholder={loadedModelId ? "Ask something..." : "Load a model first..."}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={!loadedModelId || isGenerating}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
          <Button type="primary" icon={<SendOutlined />} disabled={!canSend} loading={isGenerating} onClick={sendPrompt}>
            Send
          </Button>
        </div>
        <Text type="secondary" className={styles.helperText}>
          Inference currently uses placeholder text generation response shape.
        </Text>
      </Card>

      <Drawer
        title="Chat Settings"
        placement="right"
        onClose={() => setIsSettingsOpen(false)}
        open={isSettingsOpen}
      >
        <Form layout="vertical" form={form} onFinish={onSaveSettings}>
          <Form.Item label="Default Model" name="defaultModelId" rules={[{ required: true }]}>
            <Select
              options={downloadedModels.map((model) => ({
                label: `${model.name} (${model.size})`,
                value: model.id,
              }))}
              placeholder="Select downloaded model"
            />
          </Form.Item>

          <Form.Item label="Max Tokens" name="maxTokens" rules={[{ required: true }]}>
            <InputNumber min={1} max={4096} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Temperature" name="temperature" rules={[{ required: true }]}>
            <InputNumber min={0} max={2} step={0.1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Enable JSON Mode" name="jsonMode" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
            Save Settings
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
