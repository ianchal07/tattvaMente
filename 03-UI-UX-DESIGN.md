# UI/UX Design System

## Design Philosophy

### Core Principles

1. **Light & Airy**: Clean, spacious layout with generous whitespace
2. **Sophisticated Simplicity**: Complex functionality with simple interface
3. **Performance Transparency**: Show what's happening under the hood
4. **Debugging-Friendly**: Rich visual feedback for developers
5. **Accessibility First**: WCAG 2.1 AA compliant

### Design Language

- **Modern Minimalism**: Clean lines, subtle shadows, refined typography
- **Data Visualization**: Charts and metrics presented beautifully
- **Progressive Disclosure**: Advanced features hidden until needed
- **Micro-interactions**: Smooth animations and transitions

## Theme Configuration

### Ant Design 6 Theme Setup

```typescript
// app/providers/theme-provider.tsx

'use client';

import { ConfigProvider, theme } from 'antd';
import { ReactNode } from 'react';

const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Primary Colors
    colorPrimary: '#4F46E5',        // Indigo-600
    colorSuccess: '#10B981',        // Emerald-500
    colorWarning: '#F59E0B',        // Amber-500
    colorError: '#EF4444',          // Red-500
    colorInfo: '#3B82F6',           // Blue-500
    
    // Background & Surface
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F9FAFB',       // Gray-50
    colorBgSpotlight: '#F3F4F6',    // Gray-100
    
    // Text
    colorText: '#111827',           // Gray-900
    colorTextSecondary: '#6B7280',  // Gray-500
    colorTextTertiary: '#9CA3AF',   // Gray-400
    colorTextQuaternary: '#D1D5DB', // Gray-300
    
    // Border
    colorBorder: '#E5E7EB',         // Gray-200
    colorBorderSecondary: '#F3F4F6', // Gray-100
    
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // Spacing
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    
    // Border Radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Shadows
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s'
  },
  
  components: {
    Button: {
      primaryShadow: '0 2px 0 rgba(79, 70, 229, 0.1)',
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingContentHorizontal: 16
    },
    
    Input: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingBlock: 8,
      paddingInline: 12
    },
    
    Card: {
      paddingLG: 24,
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },
    
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#FFFFFF',
      bodyBg: '#F9FAFB'
    },
    
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#EEF2FF',  // Indigo-50
      itemSelectedColor: '#4F46E5',
      itemHoverBg: '#F9FAFB',
      itemHeight: 40
    },
    
    Table: {
      headerBg: '#F9FAFB',
      headerColor: '#374151',
      rowHoverBg: '#F9FAFB',
      borderColor: '#E5E7EB'
    },
    
    Drawer: {
      paddingLG: 24
    },
    
    Modal: {
      paddingLG: 24,
      borderRadiusLG: 12
    },
    
    Notification: {
      width: 384
    },
    
    Tag: {
      defaultBg: '#F3F4F6',
      defaultColor: '#374151'
    }
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={lightTheme}>
      {children}
    </ConfigProvider>
  );
}
```

### Global Styles

```css
/* styles/globals.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  /* Custom properties for non-Ant Design elements */
  --color-brand: #4F46E5;
  --color-brand-light: #818CF8;
  --color-brand-lighter: #C7D2FE;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-success: linear-gradient(135deg, #10B981 0%, #059669 100%);
  --gradient-warning: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
  background-color: #F9FAFB;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #F3F4F6;
}

::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* Selection */
::selection {
  background-color: #C7D2FE;
  color: #1E1B4B;
}

/* Focus styles */
:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Component Library

### 1. Sophisticated Card Component

```typescript
// components/ui/SophisticatedCard.tsx

import { Card, CardProps } from 'antd';
import { ReactNode } from 'react';
import styles from './SophisticatedCard.module.css';

interface SophisticatedCardProps extends CardProps {
  children: ReactNode;
  elevated?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  gradient?: boolean;
}

export function SophisticatedCard({
  children,
  elevated = false,
  bordered = true,
  hoverable = false,
  gradient = false,
  className,
  ...props
}: SophisticatedCardProps) {
  const classNames = [
    styles.card,
    elevated && styles.elevated,
    gradient && styles.gradient,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <Card
      bordered={bordered}
      hoverable={hoverable}
      className={classNames}
      {...props}
    >
      {children}
    </Card>
  );
}
```

```css
/* components/ui/SophisticatedCard.module.css */

.card {
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.elevated {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.card:hover.elevated {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  transform: translateY(-2px);
}

.gradient {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
}

.gradient::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, #4F46E5 0%, #818CF8 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### 2. Metric Display Component

```typescript
// components/ui/MetricDisplay.tsx

import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Typography, Space } from 'antd';
import styles from './MetricDisplay.module.css';

const { Text, Title } = Typography;

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down';
    value: number;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export function MetricDisplay({
  label,
  value,
  unit,
  trend,
  icon,
  color = 'primary'
}: MetricDisplayProps) {
  const trendColor = trend?.positive
    ? trend.direction === 'up' ? '#10B981' : '#EF4444'
    : trend?.direction === 'up' ? '#EF4444' : '#10B981';
  
  return (
    <div className={styles.container}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          {icon && <span className={styles.icon}>{icon}</span>}
          <Text type="secondary" className={styles.label}>
            {label}
          </Text>
        </Space>
        
        <Space align="baseline" size={4}>
          <Title level={3} className={`${styles.value} ${styles[color]}`}>
            {value}
          </Title>
          {unit && (
            <Text type="secondary" className={styles.unit}>
              {unit}
            </Text>
          )}
        </Space>
        
        {trend && (
          <Space size={4} className={styles.trend}>
            {trend.direction === 'up' ? (
              <ArrowUpOutlined style={{ color: trendColor }} />
            ) : (
              <ArrowDownOutlined style={{ color: trendColor }} />
            )}
            <Text style={{ color: trendColor, fontSize: 12 }}>
              {trend.value}%
            </Text>
          </Space>
        )}
      </Space>
    </div>
  );
}
```

```css
/* components/ui/MetricDisplay.module.css */

.container {
  padding: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.container:hover {
  border-color: #4F46E5;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.1);
}

.label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  margin: 0 !important;
  font-weight: 600;
  line-height: 1.2;
}

.value.primary {
  color: #4F46E5;
}

.value.success {
  color: #10B981;
}

.value.warning {
  color: #F59E0B;
}

.value.error {
  color: #EF4444;
}

.unit {
  font-size: 14px;
  opacity: 0.7;
}

.trend {
  font-weight: 500;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #EEF2FF;
  color: #4F46E5;
}
```

### 3. Status Badge Component

```typescript
// components/ui/StatusBadge.tsx

import { Badge, BadgeProps } from 'antd';
import styles from './StatusBadge.module.css';

type StatusType = 'active' | 'idle' | 'loading' | 'error' | 'success' | 'warning';

interface StatusBadgeProps extends Omit<BadgeProps, 'status'> {
  status: StatusType;
  text?: string;
  pulse?: boolean;
}

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  active: { color: '#10B981', label: 'Active' },
  idle: { color: '#6B7280', label: 'Idle' },
  loading: { color: '#3B82F6', label: 'Loading' },
  error: { color: '#EF4444', label: 'Error' },
  success: { color: '#10B981', label: 'Success' },
  warning: { color: '#F59E0B', label: 'Warning' }
};

export function StatusBadge({ status, text, pulse = false, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      color={config.color}
      text={text || config.label}
      className={pulse ? styles.pulse : ''}
      {...props}
    />
  );
}
```

```css
/* components/ui/StatusBadge.module.css */

.pulse :global(.ant-badge-status-dot) {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### 4. Progress Ring Component

```typescript
// components/ui/ProgressRing.tsx

import { Progress, ProgressProps } from 'antd';
import styles from './ProgressRing.module.css';

interface ProgressRingProps extends ProgressProps {
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ProgressRing({
  size = 120,
  strokeWidth = 8,
  percent = 0,
  label,
  ...props
}: ProgressRingProps) {
  return (
    <div className={styles.container}>
      <Progress
        type="circle"
        percent={percent}
        size={size}
        strokeWidth={strokeWidth}
        strokeColor={{
          '0%': '#4F46E5',
          '100%': '#818CF8'
        }}
        format={(percent) => (
          <div className={styles.content}>
            <div className={styles.percent}>{percent}%</div>
            {label && <div className={styles.label}>{label}</div>}
          </div>
        )}
        {...props}
      />
    </div>
  );
}
```

```css
/* components/ui/ProgressRing.module.css */

.container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.percent {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  line-height: 1;
}

.label {
  font-size: 12px;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

## Layout Components

### Main Layout

```typescript
// components/layout/MainLayout.tsx

import { Layout, Menu, MenuProps, Space, Avatar, Dropdown } from 'antd';
import {
  MessageOutlined,
  SettingOutlined,
  BugOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import styles from './MainLayout.module.css';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const menuItems: MenuProps['items'] = [
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: 'Chat'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings'
    },
    {
      key: 'debug',
      icon: <BugOutlined />,
      label: 'Debug'
    }
  ];
  
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true
    }
  ];
  
  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <Space size={16}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>AI</div>
              <span className={styles.logoText}>Browser LLM</span>
            </div>
            <StatusBadge status="active" pulse />
          </Space>
          
          <Space size={16}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                size={40}
                icon={<UserOutlined />}
                style={{ cursor: 'pointer', background: '#4F46E5' }}
              />
            </Dropdown>
          </Space>
        </div>
      </Header>
      
      <Layout>
        <Sider width={240} className={styles.sider}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['chat']}
            items={menuItems}
            className={styles.menu}
          />
        </Sider>
        
        <Content className={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
```

```css
/* components/layout/MainLayout.module.css */

.layout {
  min-height: 100vh;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.headerContent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logoIcon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4F46E5 0%, #818CF8 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.logoText {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.sider {
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
}

.menu {
  padding: 16px;
  border-right: none;
}

.content {
  padding: 24px;
  background: #F9FAFB;
  min-height: calc(100vh - 64px);
}
```

## Page Layouts

### Chat Interface

```typescript
// app/components/ChatInterface.tsx

import { Input, Button, Space, Empty } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';
import { SophisticatedCard } from '@/components/ui/SophisticatedCard';
import { MetricDisplay } from '@/components/ui/MetricDisplay';
import styles from './ChatInterface.module.css';

export function ChatInterface() {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <SophisticatedCard title="Performance" elevated>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <MetricDisplay
              label="Tokens/Sec"
              value={18.5}
              color="primary"
              trend={{ direction: 'up', value: 12, positive: true }}
            />
            <MetricDisplay
              label="Memory"
              value={3.2}
              unit="GB"
              color="success"
            />
            <MetricDisplay
              label="Latency"
              value={54}
              unit="ms"
              color="primary"
            />
          </Space>
        </SophisticatedCard>
      </div>
      
      <div className={styles.main}>
        <SophisticatedCard className={styles.chatCard}>
          <div className={styles.messages}>
            <Empty
              description="Start a conversation"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
          
          <div className={styles.inputArea}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Ask me anything..."
                size="large"
                className={styles.input}
              />
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
              >
                Send
              </Button>
            </Space.Compact>
          </div>
        </SophisticatedCard>
      </div>
    </div>
  );
}
```

```css
/* app/components/ChatInterface.module.css */

.container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main {
  display: flex;
  flex-direction: column;
}

.chatCard {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 160px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inputArea {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.input {
  border-radius: 8px 0 0 8px !important;
}
```

Continue with more UI components in next documentation file...
