"use client";

import {
  BugOutlined,
  MessageOutlined,
  ThunderboltOutlined
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Badge, Layout, Menu, Space, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const items: MenuProps["items"] = [
  {
    key: "/configuration",
    icon: <ThunderboltOutlined />,
    label: <Link href="/configuration">Configuration</Link>,
  },
  {
    key: "/",
    icon: <MessageOutlined />,
    label: <Link href="/">Chat</Link>,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const selected = pathname === "" ? "/" : pathname;

  return (
    <Layout className={styles.root}>
      <Header className={styles.header}>
        <Space align="center" size={12}>
          <div className={styles.logo}>TM</div>
          <div>
            <Title level={5} className={styles.title}>
              TattvaMente
            </Title>
            <Text type="secondary">First-Principles Intelligence in Your Browser</Text>
          </div>
        </Space>
      </Header>

      <Layout>
        <Sider width={240} theme="light" className={styles.sider}>
          <Menu mode="inline" selectedKeys={[selected]} items={items} className={styles.menu} />
        </Sider>
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}