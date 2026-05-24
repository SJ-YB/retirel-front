import { http, HttpResponse } from 'msw'

import type { UpdateAccountRequest } from '../types/account'
import {
  mockAccounts,
  mockTransactions,
  mockHoldings,
  mockDebts,
  mockDeposits,
  mockAssetsSummary,
  mockDashboardSummary,
  mockNetWorthTrend,
  mockAllocation,
  mockIncomeHistory,
} from './data'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const handlers = [
  // ── 대시보드 ──────────────────────────────────
  http.get(`${API_BASE}/dashboard/summary`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: mockDashboardSummary }),
  ),
  http.get(`${API_BASE}/dashboard/networth-trend`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: mockNetWorthTrend }),
  ),
  http.get(`${API_BASE}/dashboard/allocation`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: mockAllocation }),
  ),
  http.get(`${API_BASE}/dashboard/income-history`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: mockIncomeHistory }),
  ),

  // ── 계좌 ──────────────────────────────────────
  http.get(`${API_BASE}/accounts`, () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockAccounts,
      meta: { page: 1, size: 20, totalElements: mockAccounts.length, totalPages: 1 },
    }),
  ),

  http.get(`${API_BASE}/accounts/:id`, ({ params }) => {
    const account = mockAccounts.find((a) => a.id === params.id)
    if (!account) {
      return HttpResponse.json(
        { success: false, message: '계좌를 찾을 수 없습니다' },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, message: 'OK', data: account })
  }),

  // 계좌 생성(POST)은 실제 백엔드(POST /api/v1/accounts)로 직접 보낸다.
  // MSW 핸들러를 두지 않으므로 onUnhandledRequest='bypass'로 네트워크에 통과된다.

  http.put(`${API_BASE}/accounts/:id`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateAccountRequest
    const index = mockAccounts.findIndex((a) => a.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: '계좌를 찾을 수 없습니다' },
        { status: 404 },
      )
    }
    mockAccounts[index] = {
      ...mockAccounts[index],
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.owner !== undefined && { owner: body.owner }),
    }
    return HttpResponse.json({
      success: true,
      message: '계좌가 수정되었습니다',
      data: mockAccounts[index],
    })
  }),

  // ── 거래 내역 ─────────────────────────────────
  // 거래내역은 증권사 API 연동으로만 입수한다(수동 등록 없음).
  http.get(`${API_BASE}/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('account_id')
    const type = url.searchParams.get('type')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const page = Number(url.searchParams.get('page') ?? '1')
    const size = Number(url.searchParams.get('size') ?? '20')

    let filtered = [...mockTransactions]
    if (accountId) filtered = filtered.filter((t) => t.accountId === accountId)
    if (type) filtered = filtered.filter((t) => t.type === type)
    if (from) filtered = filtered.filter((t) => t.date >= from)
    if (to) filtered = filtered.filter((t) => t.date <= to)

    const totalElements = filtered.length
    const totalPages = Math.ceil(totalElements / size)
    const start = (page - 1) * size
    const paged = filtered.slice(start, start + size)

    return HttpResponse.json({
      success: true,
      message: 'OK',
      data: paged,
      meta: { page, size, totalElements, totalPages },
    })
  }),

  // ── 자산 ──────────────────────────────────────
  http.get(`${API_BASE}/assets/summary`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: mockAssetsSummary }),
  ),
  http.get(`${API_BASE}/assets/holdings`, () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockHoldings,
      meta: { page: 1, size: 20, totalElements: mockHoldings.length, totalPages: 1 },
    }),
  ),
  http.get(`${API_BASE}/assets/debts`, () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockDebts,
      meta: { page: 1, size: 20, totalElements: mockDebts.length, totalPages: 1 },
    }),
  ),
  http.get(`${API_BASE}/assets/deposits`, () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockDeposits,
      meta: { page: 1, size: 20, totalElements: mockDeposits.length, totalPages: 1 },
    }),
  ),
  // 하위 호환
  http.get(`${API_BASE}/assets`, () =>
    HttpResponse.json({
      success: true,
      message: 'OK',
      data: mockHoldings,
      meta: { page: 1, size: 20, totalElements: mockHoldings.length, totalPages: 1 },
    }),
  ),
]
