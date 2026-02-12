"use client";

import type { ReactNode } from "react";
import { ConfigProvider, theme } from "antd";

const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#0f766e",
    colorSuccess: "#0ea5a4",
    colorWarning: "#f59e0b",
    colorError: "#dc2626",
    colorInfo: "#0ea5e9",
    colorBgLayout: "#f6f7fb",
    colorBgContainer: "#ffffff",
    colorText: "#0f172a",
    colorTextSecondary: "#64748b",
    borderRadius: 12,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={lightTheme}>{children}</ConfigProvider>;
}
