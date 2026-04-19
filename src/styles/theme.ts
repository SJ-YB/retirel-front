import type { ThemeConfig } from 'antd'
import { theme as antdTheme } from 'antd'

const theme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: '#F5C26B',
    colorSuccess: '#6EE7A8',
    colorWarning: '#F5C26B',
    colorError: '#F38BA8',
    colorInfo: '#7CB8F5',

    colorBgBase: '#0B1220',
    colorBgContainer: '#111A2E',
    colorBgElevated: '#17223B',
    colorBgLayout: '#0B1220',
    colorBorder: 'rgba(255, 255, 255, 0.06)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.10)',
    colorText: '#E7ECF5',
    colorTextSecondary: '#A7B0C2',
    colorTextTertiary: '#6B7794',

    fontFamily:
      "'Inter', 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    fontSize: 14,

    borderRadius: 10,
    controlHeight: 36,

    boxShadow:
      '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 12px 40px -20px rgba(0, 0, 0, 0.6)',
  },
  components: {
    Button: {
      controlHeight: 36,
      borderRadius: 10,
      primaryColor: '#1a1405',
    },
    Modal: {
      titleFontSize: 18,
      headerBg: '#111A2E',
      contentBg: '#111A2E',
    },
    Input: {
      controlHeight: 36,
      borderRadius: 8,
    },
    Select: {
      controlHeight: 36,
      borderRadius: 8,
    },
    DatePicker: {
      controlHeight: 36,
      borderRadius: 8,
    },
    Form: {
      labelFontSize: 12,
      verticalLabelPadding: '0 0 4px',
      labelColor: '#A7B0C2',
    },
  },
}

export default theme
