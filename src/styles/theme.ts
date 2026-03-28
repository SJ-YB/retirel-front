import type { ThemeConfig } from 'antd'

const theme: ThemeConfig = {
  token: {
    // Color palette - professional financial/admin style
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',

    // Neutral tones
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBorder: '#d9d9d9',
    colorText: '#262626',
    colorTextSecondary: '#8c8c8c',

    // Typography
    fontFamily:
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    fontSize: 14,

    // Spacing & sizing
    borderRadius: 6,
    controlHeight: 36,

    // Shadows
    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  },
  components: {
    Button: {
      controlHeight: 36,
      borderRadius: 6,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      rowHoverBg: '#f5f5f5',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Modal: {
      titleFontSize: 18,
    },
    Input: {
      controlHeight: 36,
      borderRadius: 6,
    },
    Select: {
      controlHeight: 36,
      borderRadius: 6,
    },
    Form: {
      labelFontSize: 14,
      verticalLabelPadding: '0 0 4px',
    },
  },
}

export default theme
