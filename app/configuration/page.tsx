"use client";

import {
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  CloudDownloadOutlined,
  CheckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  Badge,
} from "antd";
import { useMemo } from "react";
import { useLLMSetup } from "@/hooks/use-llm-setup";
import styles from "./compatibility.module.css";

const { Text, Title, Paragraph } = Typography;

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

  // ============================================================================
  // Computed Values
  // ============================================================================

  const systemChecks = useMemo(
    () => [
      {
        title: "GPU VRAM",
        value: compatibility?.webgpuAvailable
          ? `${compatibility.isMemoryCapped ? "≥ " : ""}${compatibility.estimatedVramGB} GB`
          : "N/A",
        icon: <ThunderboltOutlined style={{ fontSize: 24, color: "#f59e0b" }} />,
        tooltip: compatibility?.isMemoryCapped
          ? "Estimated from system RAM. Actual VRAM may be higher."
          : undefined,
        status: compatibility?.webgpuAvailable ? "success" : "warning",
      },
      {
        title: "System RAM",
        value: compatibility?.deviceMemoryGB
          ? `${compatibility.isMemoryCapped ? "≥ " : ""}${compatibility.deviceMemoryGB} GB`
          : "N/A",
        icon: <DatabaseOutlined style={{ fontSize: 24, color: "#0d9488" }} />,
        tooltip: compatibility?.isMemoryCapped
          ? "Browsers cap reported RAM at 8GB for privacy. Your actual RAM is likely higher."
          : undefined,
        status: compatibility?.deviceMemoryGB && compatibility.deviceMemoryGB >= 8 ? "success" : "warning",
      },
      {
        title: "Storage Quota",
        value: compatibility?.storageAvailable
          ? `${compatibility.quotaGB} GB`
          : "N/A",
        icon: <CheckCircleOutlined style={{ fontSize: 24, color: "#10b981" }} />,
        status: compatibility?.quotaGB && compatibility.quotaGB >= 10 ? "success" : "warning",
      },
    ],
    [compatibility]
  );

  const downloadedCount = models.filter((model) => model.downloaded).length;
  const totalCount = models.length;
  const quotaGB = compatibility?.quotaGB ?? 0;
  const usageGB = compatibility?.usageGB ?? 0;
  const freeGB = Math.max(quotaGB - usageGB, 0);
  const usedPct = quotaGB > 0 ? Number(((usageGB / quotaGB) * 100).toFixed(1)) : 0;

  const canDownload = Boolean(
    selectedModel?.source?.model_uri && !selectedModel?.downloaded && !isDownloading
  );
  const canLoad = Boolean(selectedModel?.downloaded) && selectedModelId !== loadedModelId;
  const canDelete = Boolean(selectedModel?.downloaded);

  const storageStatus = useMemo(() => {
    if (usedPct >= 90) return { color: "error", label: "Critical" };
    if (usedPct >= 70) return { color: "warning", label: "High" };
    return { color: "success", label: "Good" };
  }, [usedPct]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 28 }}>
            System Configuration
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 15 }}>
            Validate browser capabilities, download models, and manage your local AI setup
          </Paragraph>
        </div>
        <Popconfirm
          title="Clear all storage?"
          description="This will remove all downloaded models. This action cannot be undone."
          onConfirm={clearAllModels}
          okText="Clear All"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={downloadedCount === 0}
            size="large"
          >
            Clear Storage
          </Button>
        </Popconfirm>
      </div>

      <Space orientation="vertical" size={20} style={{ width: "100%" }}>
        {/* System Capabilities */}
        <Card
          title={
            <Space>
              <RocketOutlined style={{ color: "#0d9488" }} />
              <span>System Capabilities</span>
            </Space>
          }
          className={styles.sectionCard}
        >
          <Row gutter={[16, 16]}>
            {systemChecks.map((check) => (
              <Col xs={24} sm={8} key={check.title}>
                <div className={styles.capabilityCard}>
                  <div className={styles.capabilityIcon}>
                    {check.icon}
                  </div>
                  <div className={styles.capabilityContent}>
                    <Space size={4} align="center">
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {check.title}
                      </Text>
                      {check.tooltip && (
                        <Tooltip title={check.tooltip}>
                          <InfoCircleOutlined className={styles.infoIcon} />
                        </Tooltip>
                      )}
                    </Space>
                    <Text strong style={{ fontSize: 20 }}>
                      {check.value}
                    </Text>
                    <Badge
                      status={check.status as any}
                      text={check.status === "success" ? "Compatible" : "Limited"}
                      className={styles.statusBadge}
                    />
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Storage Overview */}
        <Card
          title={
            <Space>
              <DatabaseOutlined style={{ color: "#0d9488" }} />
              <span>Storage Overview</span>
            </Space>
          }
          className={styles.sectionCard}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Used"
                value={usageGB}
                suffix="GB"
                precision={2}
                style={{ color: storageStatus.color === "error" ? "#ef4444" : "#0f172a" }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Available"
                value={freeGB}
                suffix="GB"
                precision={2}
                style={{ color: "#10b981" }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Downloaded"
                value={downloadedCount}
                suffix={`of ${totalCount}`}
                style={{ color: "#0d9488" }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: "20px 0" }} />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text type="secondary">Storage Usage</Text>
              <Text strong>{usedPct}%</Text>
            </div>
            <Progress
              percent={usedPct}
              strokeColor={{
                "0%": storageStatus.color === "error" ? "#ef4444" : "#0d9488",
                "100%": storageStatus.color === "error" ? "#dc2626" : "#14b8a6",
              }}
              railColor="#f1f5f9"
              status={storageStatus.color === "error" ? "exception" : "active"}
            />
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <Tag color={storageStatus.color}>
                {storageStatus.label} - {usageGB.toFixed(2)} GB / {quotaGB.toFixed(2)} GB
              </Tag>
            </div>
          </div>
        </Card>

        {/* Model Selection & Management */}
        <Card
          title={
            <Space>
              <CloudDownloadOutlined style={{ color: "#0d9488" }} />
              <span>Model Management</span>
            </Space>
          }
          className={styles.sectionCard}
        >
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {/* Model Selector */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Select Model
              </Text>
              <Select
                showSearch={{
                  filterOption: (input, option) => {
                    const search = input.toLowerCase();
                    const label = (option?.searchLabel as string) || "";
                    return label.includes(search);
                  },
                }}

                size="large"
                placeholder="Choose a model to download or load..."
                value={selectedModelId || undefined}
                onChange={setSelectedModelId}
                style={{ width: "100%" }}
                options={models.map((model) => {
                  let statusIndicator = null;

                  if (model.id === loadedModelId) {
                    statusIndicator = (
                      <Tag color="blue" icon={<CheckOutlined />}>
                        Loaded
                      </Tag>
                    );
                  } else if (model.downloaded) {
                    statusIndicator = (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        Ready
                      </Tag>
                    );
                  }

                  return {
                    value: model.id,
                    searchLabel: `${model.name} ${model.size}`.toLowerCase(),
                    label: (
                      <div className={styles.selectOption}>
                        <div className={styles.selectOptionLeft}>
                          <Text strong>{model.name}</Text>
                          <Space size={6} style={{ marginTop: 2 }}>
                            <Tag variant={"filled"} color="default" style={{ fontSize: 11 }}>
                              {model.size}
                            </Tag>
                            <Tag variant={"filled"} color="purple" style={{ fontSize: 11 }}>
                              {model.quality_tier}
                            </Tag>
                          </Space>
                        </div>
                        <div className={styles.selectOptionRight}>{statusIndicator}</div>
                      </div>
                    ),
                  };
                })}
              />
            </div>

            {/* Selected Model Info */}
            {selectedModel && (
              <div className={styles.selectedModelCard}>
                <div className={styles.modelHeader}>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      {selectedModel.name}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Space size={8} wrap>
                        <Tag
                          color={selectedModel.downloaded ? "green" : "default"}
                          icon={selectedModel.downloaded ? <CheckCircleOutlined /> : <DownloadOutlined />}
                        >
                          {selectedModel.downloaded ? "Downloaded" : "Not Downloaded"}
                        </Tag>
                        <Tag color="blue">VRAM: {selectedModel.vram_required}</Tag>
                        <Tag color="purple">Size: {selectedModel.size}</Tag>
                        <Tag color="cyan">Speed: {selectedModel.speed_tier}</Tag>
                        {loadedModelId === selectedModel.id && (
                          <Tag color="gold" icon={<RocketOutlined />}>
                            Currently Loaded
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </div>
                </div>

                <Divider style={{ margin: "16px 0" }} />

                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Source: <Text code style={{ fontSize: 12 }}>{selectedModel.source?.model_uri ?? "N/A"}</Text>
                  </Text>
                </div>

                {/* Download Progress */}
                {isDownloading && (
                  <div className={styles.downloadProgress}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text>Downloading model...</Text>
                      <Text strong>{downloadProgress}%</Text>
                    </div>
                    <Progress
                      percent={downloadProgress}
                      status="active"
                      strokeColor={{ "0%": "#0d9488", "100%": "#14b8a6" }}
                    />
                  </div>
                )}

                {/* Error Alert */}
                {downloadError && (
                  <Alert
                    type="error"
                    showIcon
                    message="Download Failed"
                    description={downloadError}
                    style={{ marginTop: 16 }}
                  />
                )}

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<DownloadOutlined />}
                    onClick={downloadModel}
                    disabled={!canDownload}
                    loading={isDownloading}
                    block
                  >
                    {selectedModel.downloaded ? "Already Downloaded" : "Download Model"}
                  </Button>
                  <Button
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={loadSelectedModel}
                    disabled={!canLoad}
                    block
                  >
                    {loadedModelId === selectedModelId ? "Already Loaded" : "Load for Inference"}
                  </Button>
                  {canDelete && (
                    <Popconfirm
                      title="Delete this model?"
                      description="This will remove the model files from storage."
                      onConfirm={() => deleteModel(selectedModelId)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger size="large" icon={<DeleteOutlined />} block>
                        Delete Model
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            )}

            {!selectedModel && (
              <Empty
                description="Select a model from the dropdown above"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Space>
        </Card>

        {/* Suggested Models */}
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: "#0d9488" }} />
              <span>Recommended Models</span>
              <Tag color="blue">{suggestions.length} Compatible</Tag>
            </Space>
          }
          className={styles.sectionCard}
        >
          {suggestions.length === 0 ? (
            <Empty
              description="No compatible models found for your system"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Paragraph type="secondary" style={{ maxWidth: 400, margin: "0 auto" }}>
                Your system may have insufficient resources or all compatible models are already downloaded.
              </Paragraph>
            </Empty>
          ) : (
            <div className={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.id} className={styles.suggestionCard}>
                  <div className={styles.suggestionNumber}>{index + 1}</div>
                  <div className={styles.suggestionContent}>
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        {suggestion.name}
                      </Text>
                      <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4, fontSize: 13 }}>
                        {suggestion.reason}
                      </Paragraph>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => setSelectedModelId(suggestion.id)}
                      disabled={selectedModelId === suggestion.id}
                    >
                      {selectedModelId === suggestion.id ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* System Info Alert */}
        {compatibility && !compatibility.webgpuAvailable && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            title="WebGPU Not Available"
            description="Your browser does not support WebGPU. Please use Chrome 113+ or Edge 113+ for the best experience."
            style={{ marginTop: 16 }}
          />
        )}
      </Space>
    </div>
  );
}