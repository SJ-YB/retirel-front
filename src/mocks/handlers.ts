import { http, HttpResponse } from 'msw'

import type { CreateAccountRequest, UpdateAccountRequest } from '../types/account'
import {
  mockAccounts,
  mockTransactions,
  mockAssets,
  mockDashboardSummary,
} from './data'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const handlers = [
  // ── 대시보드 ──────────────────────────────────
  http.get(`${API_BASE}/dashboard/summary`, () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockDashboardSummary,
    })
  }),

  // ── 계좌 ──────────────────────────────────────
  http.get(`${API_BASE}/accounts`, () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockAccounts,
      meta: {
        page: 1,
        size: 10,
        totalElements: mockAccounts.length,
        totalPages: 1,
      },
    })
  }),

  http.get(`${API_BASE}/accounts/:id`, ({ params }) => {
    const account = mockAccounts.find((a) => a.id === params.id)
    if (!account) {
      return HttpResponse.json(
        { success: false, message: '계좌를 찾을 수 없습니다' },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: account,
    })
  }),

  http.post(`${API_BASE}/accounts`, async ({ request }) => {
    const body = (await request.json()) as CreateAccountRequest
    const newAccount = {
      id: `acc-${Date.now()}`,
      name: body.name,
      bank: body.bank,
      accountNumber: body.accountNumber ?? '',
      currency: body.currency,
      ownerName: body.ownerName,
      balance: 0,
    }
    mockAccounts.push(newAccount)
    return HttpResponse.json({
      success: true,
      message: '계좌가 등록되었습니다',
      data: newAccount,
    })
  }),

  http.put(`${API_BASE}/accounts/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateAccountRequest
    const index = mockAccounts.findIndex((a) => a.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: '계좌를 찾을 수 없습니다' },
        { status: 404 },
      )
    }
    mockAccounts[index] = { ...mockAccounts[index], name: body.name }
    return HttpResponse.json({
      success: true,
      message: '계좌가 수정되었습니다',
      data: mockAccounts[index],
    })
  }),

  // ── 거래 내역 ─────────────────────────────────
  http.get(`${API_BASE}/transactions`, () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockTransactions,
      meta: {
        page: 1,
        size: 20,
        totalElements: mockTransactions.length,
        totalPages: 1,
      },
    })
  }),

  // ── 자산 ──────────────────────────────────────
  http.get(`${API_BASE}/assets`, () => {
    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockAssets,
      meta: {
        page: 1,
        size: 20,
        totalElements: mockAssets.length,
        totalPages: 1,
      },
    })
  }),
]
