import { Card, Col, Row, Space, Table, Tag } from "antd";

const logRows = [
  { key: "1", level: "info", service: "SystemService", message: "Status requested" },
  { key: "2", level: "info", service: "ModelRegistryService", message: "Models listed" },
  { key: "3", level: "warn", service: "GenerateRoute", message: "Using placeholder generator" },
];

export default function DebugPage() {
  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <h2 style={{ margin: 0 }}>Debug Panel</h2>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          Logs, traces, and performance visibility for service-level debugging.
        </p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Service Health">
            <Space size={12}>
              <Tag color="green">API Ready</Tag>
              <Tag color="blue">Metrics Active</Tag>
              <Tag color="gold">WebLLM Pending</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Traces">
            3 traces collected in this session.
          </Card>
        </Col>
      </Row>

      <Card title="Recent Logs">
        <Table
          dataSource={logRows}
          pagination={false}
          columns={[
            { title: "Level", dataIndex: "level", key: "level" },
            { title: "Service", dataIndex: "service", key: "service" },
            { title: "Message", dataIndex: "message", key: "message" },
          ]}
        />
      </Card>
    </Space>
  );
}
