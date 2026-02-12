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
  Progress,
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

  const metrics = useMemo(
    () => [
      { label: "Messages", value: messages.length, suffix: "" },
      { label: "Latency", value: 0, suffix: "ms" },
      { label: "Loaded", value: loadedModelId ? 1 : 0, suffix: "model" },
    ],
    [loadedModelId, messages.length],
  );

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

  return (
    <div className={styles.chatContainer}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            {mode === "rag" ? "RAG Chat" : "Chat"}
          </Title>
          <Paragraph type="secondary">
            {mode === "rag"
              ? "Chat with your local PDF documents."
              : "Main conversation workspace and local model interaction."}
          </Paragraph>
        </div>
        <Space>
          {mode === "rag" && (
            <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
              <Button loading={isUploading} icon={<SendOutlined style={{ transform: 'rotate(-45deg)' }} />}>
                Upload PDF
              </Button>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          )}
          <Button icon={<SettingOutlined />} onClick={() => setIsSettingsOpen(true)}>
            Settings
          </Button>
        </Space>
      </div>

      {mode === "rag" && activeDocument && (
        <Alert
          type="info"
          message={`Active Document: ${activeDocument.name}`}
          description={`Indexed ${activeDocument.chunkCount} chunks. Querying this context.`}
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="text" onClick={() => setActiveDocument(null)}>Close</Button>
          }
        />
      )}

      {isUploading && (
        <Card style={{ marginBottom: 16 }}>
          <Text>Indexing Document...</Text>
          <Progress percent={uploadProgress} status="active" />
        </Card>
      )}

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
