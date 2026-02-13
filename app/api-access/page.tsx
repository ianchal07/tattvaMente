"use client";

import { Alert, Badge, Button, Card, Divider, List, Space, Switch, Tag, Typography } from "antd";
import { useEffect, useRef, useState, useCallback } from "react";
import { generateWithWebLLM, ensureWebLLMModelLoaded, isModelLoaded } from "@/lib/browser/webllm-engine";
import { useLLMSetup } from "@/hooks/use-llm-setup";
import { CheckCircleOutlined, SyncOutlined, BugOutlined } from "@ant-design/icons";

const { Text, Title, Paragraph } = Typography;

interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: "info" | "success" | "error";
    details?: any;
}

export default function ApiAccessPage() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [status, setStatus] = useState<"idle" | "listening" | "processing">("idle");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const { loadedModelId } = useLLMSetup();
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info", details?: any) => {
        setLogs((prev) => [
            {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                message,
                type,
                details,
            },
            ...prev.slice(0, 49), // Keep last 50 logs
        ]);
    }, []);

    const processJob = useCallback(async (job: any) => {
        setStatus("processing");
        addLog(`Processing job ${job.id}`, "info", job.request);

        try {
            const response = await generateWithWebLLM(job.request.prompt, {
                maxTokens: job.request.max_tokens,
                temperature: job.request.temperature,
            });

            // Send result back
            await fetch("/api/v1/worker/result", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: job.id,
                    result: {
                        text: response,
                        usage: {
                            // Approximate usage
                            prompt_tokens: job.request.prompt.length / 4,
                            completion_tokens: response.length / 4,
                            total_tokens: (job.request.prompt.length + response.length) / 4
                        }
                    },
                }),
            });

            addLog(`Job ${job.id} completed`, "success");
        } catch (error) {
            console.error("Job processing failed", error);
            addLog(`Job ${job.id} failed`, "error", error);

            // Report error
            await fetch("/api/v1/worker/result", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: job.id,
                    error: error instanceof Error ? error.message : "Processing failed",
                }),
            });
        } finally {
            setStatus("listening");
        }
    }, [addLog]);

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/worker/poll");
            if (!res.ok) return;

            const data = await res.json();
            if (data.data?.job) {
                await processJob(data.data.job);
            }
        } catch (e) {
            // Ignore poll errors, just retry
        }
    }, [processJob]);

    useEffect(() => {
        let mounted = true;

        const startWorker = async () => {
            if (isEnabled && loadedModelId) {
                // Ensure model is actually loaded in memory
                if (!isModelLoaded(loadedModelId)) {
                    setStatus("processing"); // Show processing while loading
                    addLog(`Reloading model ${loadedModelId}...`, "info");

                    try {
                        await ensureWebLLMModelLoaded(loadedModelId);
                        if (!mounted) return;
                        addLog("Model loaded successfully", "success");
                    } catch (error) {
                        if (!mounted) return;
                        console.error("Failed to reload model:", error);
                        addLog("Failed to reload model", "error", error);
                        setIsEnabled(false);
                        setStatus("idle");
                        return;
                    }
                }

                // Explicitly connect to the server
                try {
                    await fetch("/api/v1/worker/connect", { method: "POST" });
                    addLog("Worker connected to server", "success");
                } catch (e) {
                    console.error("Failed to connect:", e);
                    addLog("Failed to connect to server", "error");
                    setIsEnabled(false);
                    setStatus("idle");
                    return;
                }

                setStatus("listening");
                pollTimerRef.current = setInterval(poll, 1000); // Poll every 1s
                addLog("Worker started listening for requests", "info");
            } else {
                setStatus("idle");
                if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                }

                // If we were enabled and now disabled (or unmounting), tell server to stop
                // We track this by checking if we just stopped polling
                if (!isEnabled) {
                    // Fire and forget disconnect
                    fetch("/api/v1/worker/disconnect", { method: "POST" }).catch(() => { });
                    addLog("Worker stopped", "info");
                }

                if (isEnabled && !loadedModelId) {
                    addLog("Worker paused: No model loaded", "error");
                    setIsEnabled(false);
                }
            }
        };

        startWorker();

        return () => {
            mounted = false;
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
            }
            // Attempt to disconnect on unmount if enabled
            if (isEnabled) {
                fetch("/api/v1/worker/disconnect", { method: "POST", keepalive: true }).catch(() => { });
            }
        };
    }, [isEnabled, loadedModelId, poll, addLog]);

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
            <Space orientation="vertical" size={24} style={{ width: "100%" }}>
                <div>
                    <Title level={2}>API Access</Title>
                    <Paragraph type="secondary">
                        Enable external access to use your browser-hosted model from other applications.
                        Keep this tab open for the API to work.
                    </Paragraph>
                </div>

                <Card>
                    <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space>
                            <Switch
                                checked={isEnabled}
                                onChange={setIsEnabled}
                                disabled={!loadedModelId}
                            />
                            <Text strong style={{ fontSize: 16 }}>
                                {isEnabled ? "External Access Enabled" : "External Access Disabled"}
                            </Text>
                        </Space>

                        <Space>
                            <Badge status={status === "processing" ? "processing" : status === "listening" ? "success" : "default"} />
                            <Text type="secondary" style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>
                                {status}
                            </Text>
                        </Space>
                    </Space>

                    {!loadedModelId && (
                        <Alert
                            type="warning"
                            showIcon
                            message="No Model Loaded"
                            description="Please load a model in the Configuration tab before enabling API access."
                            style={{ marginTop: 16 }}
                        />
                    )}

                    {isEnabled && loadedModelId && (
                        <Alert
                            type="info"
                            showIcon
                            message="Listening for Requests"
                            description={
                                <Space orientation="vertical" size={8}>
                                    <Text>Send POST requests to:</Text>
                                    <Text code copyable>http://localhost:3000/api/v1/generate</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Body: {"{ \"prompt\": \"Hello\" }"}</Text>
                                </Space>
                            }
                            style={{ marginTop: 16 }}
                        />
                    )}
                </Card>

                <Card title="Activity Log" extra={<Button onClick={() => setLogs([])}>Clear</Button>}>
                    <List
                        dataSource={logs}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={
                                        item.type === "error" ? <BugOutlined style={{ color: "red" }} /> :
                                            item.type === "success" ? <CheckCircleOutlined style={{ color: "green" }} /> :
                                                <SyncOutlined style={{ color: "blue" }} />
                                    }
                                    title={
                                        <Space>
                                            <Text strong>{item.message}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </Text>
                                        </Space>
                                    }
                                    description={
                                        item.details ? (
                                            <Text code type="secondary" style={{ fontSize: 11 }}>
                                                {JSON.stringify(item.details)}
                                            </Text>
                                        ) : null
                                    }
                                />
                            </List.Item>
                        )}
                        style={{ maxHeight: 400, overflow: "auto" }}
                    />
                </Card>
            </Space>
        </div>
    );
}
