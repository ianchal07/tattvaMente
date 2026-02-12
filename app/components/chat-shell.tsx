"use client";

import { SendOutlined, SettingOutlined, FileTextOutlined, RobotOutlined, UserOutlined, CloseOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  Progress,
  Avatar,
  Tooltip,
  Badge,
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

interface ChatShellProps {
  initialMode?: "normal" | "rag";
}

export function ChatShell({ initialMode = "normal" }: ChatShellProps) {
  const { loadedModelId, models } = useLLMSetup();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [form] = Form.useForm<GenerationSettings>();

  // RAG State
  const [mode, setMode] = useState<"normal" | "rag">(initialMode);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeDocument, setActiveDocument] = useState<{ id: string; name: string; chunkCount: number } | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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

  const canSend = Boolean(loadedModelId && prompt.trim().length > 0 && !isGenerating && !isUploading);

  async function handleFileUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      alert("Only PDF files are supported");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Dynamic imports to save bundle size
      const { extractTextFromPDF, chunkText, normalizeText } = await import("@/lib/rag/ingestion");
      const { embeddingEngine } = await import("@/lib/rag/embeddings");
      const { RagStore } = await import("@/lib/rag/store");

      // 1. Extract
      setUploadProgress(10);
      const rawText = await extractTextFromPDF(file);
      const cleanText = normalizeText(rawText);

      // 2. Chunk
      setUploadProgress(30);
      const chunks = chunkText(cleanText);

      if (chunks.length === 0) {
        throw new Error("No text extracted from PDF");
      }

      // 3. Embed & Store
      setUploadProgress(40);
      const docId = crypto.randomUUID();

      // Save Document Metadata
      await RagStore.saveDocument({
        id: docId,
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: Date.now(),
      });

      // Embed chunks in batches
      const BATCH_SIZE = 5;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await Promise.all(batch.map(text => embeddingEngine.embed(text)));

        const chunkObjects = batch.map((text, idx) => ({
          id: `${docId}-${i + idx}`,
          documentId: docId,
          text,
          embedding: embeddings[idx],
          index: i + idx,
        }));

        await RagStore.saveChunks(chunkObjects);

        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        setUploadProgress(40 + Math.floor((currentBatch / totalBatches) * 50));
      }

      setActiveDocument({ id: docId, name: file.name, chunkCount: chunks.length });
      setUploadProgress(100);

    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
    }
  }

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

        let inputForModel: { role: string; content: string }[] = [];

        if (mode === "rag" && activeDocument) {
          const { RagRetrieval } = await import("@/lib/rag/retrieval");
          const context = await RagRetrieval.constructContext(userMessage.content, activeDocument.id);

          const systemPrompt = `You are a helpful assistant. You must answer strictly using the provided context. If the answer is not present in the context, respond: "Not found in document."\n\nContext:\n${context}`;

          inputForModel = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage.content }
          ];
        } else {
          inputForModel = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
        }

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
              {mode === "rag" ? "Document Assistant" : "AI Assistant"}
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
          {mode === "rag" && (
            <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
              <Tooltip title="Upload PDF Document">
                <Button
                  loading={isUploading}
                  icon={<FileTextOutlined />}
                  type="text"
                  size="large"
                >
                  Upload
                </Button>
              </Tooltip>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
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

      {/* Active Document Banner */}
      {mode === "rag" && activeDocument && (
        <div className={styles.documentBanner}>
          <div className={styles.documentInfo}>
            <FileTextOutlined style={{ fontSize: 16, color: '#0d9488' }} />
            <div>
              <Text strong style={{ fontSize: 13 }}>{activeDocument.name}</Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {activeDocument.chunkCount} chunks indexed
              </Text>
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setActiveDocument(null)}
          />
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className={styles.uploadProgress}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Indexing Document...</Text>
          </div>
          <Progress
            percent={uploadProgress}
            status="active"
            strokeColor="#0d9488"
            trailColor="#f1f5f9"
          />
        </div>
      )}

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