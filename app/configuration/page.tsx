"use client";

import { CheckCircleOutlined, DatabaseOutlined, DeleteOutlined, InfoCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Popconfirm, Progress, Row, Select, Space, Statistic, Tag, Tooltip, Typography } from "antd";
import { useMemo } from "react";
import { useLLMSetup } from "@/hooks/use-llm-setup";
const { Text } = Typography;
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
    deleteModel,
    clearAllModels,
  } = useLLMSetup();

  const checks = useMemo(
    () => [
      {
        title: "GPU VRAM",
        status: compatibility?.webgpuAvailable
          ? `${compatibility.isMemoryCapped ? "≥ " : ""}${compatibility.estimatedVramGB} GB`
          : "N/A",
        icon: <ThunderboltOutlined />,
        tooltip: compatibility?.isMemoryCapped
          ? "Estimated from system RAM. Actual VRAM may be higher."
          : undefined,
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
          ? `${compatibility.isMemoryCapped ? "≥ " : ""}${compatibility.deviceMemoryGB} GB`
          : "N/A",
        icon: <CheckCircleOutlined />,
        tooltip: compatibility?.isMemoryCapped
          ? "Browsers cap reported RAM at 8GB for privacy. Your actual RAM is likely higher."
          : undefined,
      },
    ],
    [compatibility],
  );

  const canDownload =
    Boolean(selectedModel?.source?.model_uri) && !selectedModel?.downloaded && !isDownloading;
  const canLoad = Boolean(selectedModel?.downloaded) && selectedModelId !== loadedModelId;
  const canDelete = Boolean(selectedModel?.downloaded);
  const downloadedCount = models.filter((model) => model.downloaded).length;
  const totalCount = models.length;
  const quotaGB = compatibility?.quotaGB ?? 0;
  const usageGB = compatibility?.usageGB ?? 0;
  const freeGB = Math.max(quotaGB - usageGB, 0);
  const usedPct = quotaGB > 0 ? Number(((usageGB / quotaGB) * 100).toFixed(1)) : 0;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h2 style={{ margin: 0 }}>System Configuration & Setup</h2>
          <p style={{ marginTop: 8, color: "#64748b" }}>
            Validate browser capabilities, download a model locally, and load it for chat.
          </p>
        </div>
        <Popconfirm
          title="Clear all storage?"
          description="This will remove all downloaded models. This action cannot be undone."
          onConfirm={clearAllModels}
          okText="Clear All"
          cancelText="Cancel"
        >
          <Button danger type="dashed" icon={<DeleteOutlined />} disabled={downloadedCount === 0}>
            Clear Storage
          </Button>
        </Popconfirm>
      </div>

      <Row gutter={[16, 16]}>
        {checks.map((item) => (
          <Col xs={24} md={8} key={item.title}>
            <Card>
              <Space orientation="vertical" size={8}>
                <span>{item.icon}</span>
                <strong>{item.title}</strong>
                <Space size={4}>
                  <span style={{ color: "#64748b" }}>{item.status}</span>
                  {item.tooltip && (
                    <Tooltip title={item.tooltip}>
                      <InfoCircleOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
                    </Tooltip>
                  )}
                </Space>
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
            showSearch={{
              filterOption: (input, option) => {
                const search = input.toLowerCase();
                const label = (option?.searchLabel as string) || "";
                return label.includes(search);
              },
            }}
            placeholder="Select a model"
            value={selectedModelId}
            onChange={setSelectedModelId}
            style={{ width: "100%" }}
            options={models.map((model) => {
              let statusTag = null;

              if (model.id === loadedModelId) {
                statusTag = <Tag color="blue">Loaded</Tag>;
              } else if (model.downloaded) {
                statusTag = <Tag color="green">Downloaded</Tag>;
              }

              return {
                value: model.id,
                searchLabel: `${model.name} ${model.size}`.toLowerCase(),
                label: (
                  <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", width: "80%", flexDirection: "row", gap: "8px", alignItems: "center" }}>
                      <Text >{model.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {model.size}
                      </Text>
                    </div>
                    <div >{statusTag}</div>
                  </div>
                ),
              };
            })}
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

          <Space wrap>
            <Button type="primary" onClick={downloadModel} disabled={!canDownload} loading={isDownloading}>
              {selectedModel?.downloaded ? "Downloaded" : "Download Model"}
            </Button>
            <Button onClick={loadSelectedModel} disabled={!canLoad}>
              {loadedModelId === selectedModelId ? "Loaded" : "Load Model"}
            </Button>
            {canDelete ? (
              <Popconfirm
                title="Delete this model?"
                description="This will remove the model files from storage."
                onConfirm={() => deleteModel(selectedModelId)}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            ) : null}
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
