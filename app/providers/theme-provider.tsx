"use client";
import type { ReactNode } from "react";
import { ConfigProvider, theme } from "antd";

const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Primary Colors - More refined teal/cyan palette
    colorPrimary: "#0891b2",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#3b82f6",

    // Background Col ors - Softer, more sophisticated

    // Text Colors - Better hierarchy
    colorText: "#0f172a",
    colorTextSecondary: "#64748b",
    colorTextTertiary: "#94a3b8",
    colorTextQuaternary: "#cbd5e1",

    // Component Sizes - More comfortable for modern UI
    controlHeight: 43,
    controlHeightLG: 48,
    controlHeightSM: 32,

    // Border & Radius - Softer, more modern
    borderRadius: 5,
    borderRadiusLG: 8,
    borderRadiusSM: 3,

    // Typography - Modern, clean font stack
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,

    // Spacing - Better consistency
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // Line height for better readability
    lineHeight: 1.5715,
    lineHeightHeading: 1.2,

    // Borders
    lineWidth: 1,
    lineType: "solid",
    colorBorder: "#e2e8f0",
    colorBorderSecondary: "#f1f5f9",

    // Shadows for depth
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    boxShadowSecondary: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  },
  components: {
    Input: {
      paddingBlock: 10,
      paddingInline: 14,
      fontSize: 14,
      lineHeight: 1.5,
      borderRadius: 5,
    },
    Select: {
      controlHeight: 43,
      fontSize: 14,
      borderRadius: 5,
    },
    Button: {
      controlHeight: 43,
      fontSize: 14,
      borderRadius: 8,
      paddingContentHorizontal: 20,
    },
    Message: {
      contentBg: "#ffffff",
      borderRadiusLG: 10,
    },
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={lightTheme}>
      {children}
    </ConfigProvider>
  );
}