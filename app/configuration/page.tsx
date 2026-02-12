"use client";

import { CheckCircleOutlined, DatabaseOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Progress, Row, Select, Space, Statistic, Tag } from "antd";
import { useMemo } from "react";
import { useLLMSetup } from "@/hooks/use-llm-setup";

export default function CompatibilityPage() {
  const {
    compatibility,
    models,
    suggestions,
    selectedModel,
    selectedModelId,
    setSelectedModelId,
    isDownloading,
    downloadProgress,
    downloadModel,
    loadSelectedModel,
    loadedModelId,
    downloadError,
  } = useLLMSetup();

  const checks = useMemo(
    () => [
      {
        title: "GPU VRAM",
        status: compatibility?.webgpuAvailable
          ? `${compatibility.estimatedVramGB} GB`
          : "N/A",
        icon: <ThunderboltOutlined />,
      },
      {
        title: "Disk Quota",
        status: compatibility?.storageAvailable
          ? `${compatibility.quotaGB} GB`
          : "N/A",
        icon: <DatabaseOutlined />,
      },
      {
        title: "System RAM",
        status: compatibility?.deviceMemoryGB
          ? `${compatibility.deviceMemoryGB} GB`
          : "N/A",
        icon: <CheckCircleOutlined />,
      },
    ],
    [compatibility],
  );

  const canDownload =
    Boolean(selectedModel?.source?.model_uri) && !selectedModel?.downloaded && !isDownloading;
  const canLoad = Boolean(selectedModel?.downloaded) && selectedModelId !== loadedModelId;
  const downloadedCount = models.filter((model) => model.downloaded).length;
  const totalCount = models.length;
  const quotaGB = compatibility?.quotaGB ?? 0;
  const usageGB = compatibility?.usageGB ?? 0;
  const freeGB = Math.max(quotaGB - usageGB, 0);
  const usedPct = quotaGB > 0 ? Number(((usageGB / quotaGB) * 100).toFixed(1)) : 0;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <h2 style={{ margin: 0 }}>System Configuration & Setup</h2>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          Validate browser capabilities, download a model locally, and load it for chat.
        </p>
      </div>

      <Row gutter={[16, 16]}>
        {checks.map((item) => (
          <Col xs={24} md={8} key={item.title}>
            <Card>
              <Space orientation="vertical" size={8}>
                <span>{item.icon}</span>
                <strong>{item.title}</strong>
                <span style={{ color: "#64748b" }}>{item.status}</span>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Storage Used" value={usageGB} suffix="GB" precision={2} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Storage Free" value={freeGB} suffix="GB" precision={2} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Downloaded Models" value={downloadedCount} suffix={`/ ${totalCount}`} />
          </Card>
        </Col>
      </Row>

      <Card title="Model Setup Wizard">
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Select
            value={selectedModelId}
            onChange={setSelectedModelId}
            options={models.map((model) => ({
              label: `${model.name} (${model.size})`,
              value: model.id,
            }))}
            style={{ width: "100%" }}
          />

          {selectedModel ? (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              <Space size={8} wrap>
                <Tag color={selectedModel.downloaded ? "green" : "default"}>
                  {selectedModel.downloaded ? "Downloaded" : "Not Downloaded"}
                </Tag>
                <Tag color="blue">VRAM: {selectedModel.vram_required}</Tag>
                <Tag color="purple">Speed: {selectedModel.speed_tier}</Tag>
                {loadedModelId === selectedModel.id ? <Tag color="gold">Loaded</Tag> : null}
              </Space>
              <span style={{ color: "#64748b", wordBreak: "break-all" }}>
                Source: {selectedModel.source?.model_uri ?? "Unavailable"}
              </span>
            </Space>
          ) : null}

          {isDownloading ? <Progress percent={downloadProgress} status="active" /> : null}
          {downloadError ? <Alert type="error" showIcon message={downloadError} /> : null}

          <Space>
            <Button type="primary" onClick={downloadModel} disabled={!canDownload} loading={isDownloading}>
              {selectedModel?.downloaded ? "Downloaded" : "Download Model"}
            </Button>
            <Button onClick={loadSelectedModel} disabled={!canLoad}>
              {loadedModelId === selectedModelId ? "Loaded" : "Load Model"}
            </Button>
          </Space>

          {compatibility ? (
            <Space orientation="vertical" size={6} style={{ width: "100%" }}>
              <span style={{ color: "#64748b" }}>
                Storage used: {compatibility.usageGB} GB / {compatibility.quotaGB} GB
              </span>
              <Progress percent={usedPct} />
            </Space>
          ) : null}
        </Space>
      </Card>

      <Card title="Suggested Models For This System">
        {suggestions.length === 0 ? (
          <span style={{ color: "#64748b" }}>No compatible suggestions found for current constraints.</span>
        ) : (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {suggestions.map((suggestion) => (
              <div key={suggestion.id}>
                <strong>{suggestion.name}</strong>
                <div style={{ color: "#64748b" }}>{suggestion.reason}</div>
              </div>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
