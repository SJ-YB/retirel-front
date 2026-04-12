// Mock 데이터 정의
// 백엔드 준비 시 이 파일만 삭제하면 됩니다.

import type { Account } from '../types/account'

export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: '주거래 계좌',
    bank: '국민은행',
    accountNumber: '123-456-789012',
    currency: 'KRW',
    ownerName: '최영범',
    balance: 15_000_000,
  },
  {
    id: 'acc-2',
    name: '급여 계좌',
    bank: '신한은행',
    accountNumber: '987-654-321098',
    currency: 'KRW',
    ownerName: '최영범',
    balance: 8_500_000,
  },
  {
    id: 'acc-3',
    name: '투자 계좌',
    bank: '미래에셋증권',
    accountNumber: '555-123-456789',
    currency: 'KRW',
    ownerName: '최영범',
    balance: 32_000_000,
  },
]

export const mockTransactions = [
  {
    id: 'txn-1',
    accountId: 'acc-1',
    date: '2026-04-12',
    description: '카페 결제',
    amount: -5_500,
    category: '식비',
    type: 'EXPENSE',
  },
  {
    id: 'txn-2',
    accountId: 'acc-2',
    date: '2026-04-11',
    description: '급여 입금',
    amount: 4_200_000,
    category: '수입',
    type: 'INCOME',
  },
  {
    id: 'txn-3',
    accountId: 'acc-1',
    date: '2026-04-10',
    description: '마트 장보기',
    amount: -87_000,
    category: '생활비',
    type: 'EXPENSE',
  },
  {
    id: 'txn-4',
    accountId: 'acc-3',
    date: '2026-04-09',
    description: 'ETF 매수',
    amount: -1_000_000,
    category: '투자',
    type: 'EXPENSE',
  },
  {
    id: 'txn-5',
    accountId: 'acc-1',
    date: '2026-04-08',
    description: '교통비',
    amount: -1_350,
    category: '교통',
    type: 'EXPENSE',
  },
]

export const mockAssets = [
  {
    id: 'asset-1',
    name: '삼성전자',
    type: 'STOCK',
    quantity: 50,
    avgPrice: 62_000,
    currentPrice: 65_500,
    totalValue: 3_275_000,
    profitRate: 5.65,
  },
  {
    id: 'asset-2',
    name: 'TIGER S&P500',
    type: 'ETF',
    quantity: 30,
    avgPrice: 18_500,
    currentPrice: 19_200,
    totalValue: 576_000,
    profitRate: 3.78,
  },
  {
    id: 'asset-3',
    name: '예금 (12개월)',
    type: 'DEPOSIT',
    quantity: 1,
    avgPrice: 10_000_000,
    currentPrice: 10_350_000,
    totalValue: 10_350_000,
    profitRate: 3.5,
  },
]

export const mockDashboardSummary = {
  totalAssets: 55_500_000,
  totalDebt: 0,
  netWorth: 55_500_000,
  monthlyIncome: 4_200_000,
  monthlyExpense: 1_093_850,
  monthlySavingsRate: 73.96,
}
