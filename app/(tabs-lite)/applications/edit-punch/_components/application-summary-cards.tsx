import { useGetRequest } from "@/hooks/api/useGetRequest"
import { getAccessToken } from "@/hooks/auth/token-store"
import { CheckCircle, Clock, ListChecks, XCircle } from "lucide-react-native"
import React, { useEffect, useMemo, useState } from "react"
import { Text, View } from "react-native"

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const json = decodeURIComponent(
      atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join("")
    )
    return JSON.parse(json) as Record<string, unknown>
  } catch { return null }
}

interface SummaryCardsProps {
  refreshTrigger?: number
}

export default function ApplicationSummaryCards({ refreshTrigger }: SummaryCardsProps) {
  const [tenantCode, setTenantCode] = useState("")

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken()
      if (!token) return
      const payload = decodeJwtPayload(token)
      if (!payload) return
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? "") || "")
    }
    void run()
  }, [])

  const base = useMemo(() => (
    tenantCode ? [{ field: "tenantCode", value: tenantCode, operator: "eq" }] : []
  ), [tenantCode])

  const enabled = Boolean(tenantCode)

  const { data: totalCount, refetch: refetchTotal } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: base,
    enabled,
  })

  const { data: pendingCount, refetch: refetchPending } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: [...base, { field: "workflowState", operator: "nin", value: ["APPROVED", "REJECTED", "CANCELLED", "CANCEL", "FAILED"] }],
    enabled,
  })

  const { data: approvedCount, refetch: refetchApproved } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: [...base, { field: "workflowState", operator: "eq", value: "APPROVED" }],
    enabled,
  })

  const { data: rejectedCount, refetch: refetchRejected } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: [...base, { field: "workflowState", operator: "eq", value: "REJECTED" }],
    enabled,
  })

  const { data: cancelledCount, refetch: refetchCancelled } = useGetRequest<number>({
    url: "editPunchApplication/count",
    method: "POST",
    data: [...base, { field: "workflowState", operator: "in", value: ["CANCELLED", "CANCEL"] }],
    enabled,
  })

  useEffect(() => {
    if (!tenantCode) return
    refetchTotal(); refetchPending(); refetchApproved(); refetchRejected(); refetchCancelled()
  }, [tenantCode, refreshTrigger])

  const counts = {
    total: totalCount ?? 0,
    pending: pendingCount ?? 0,
    approved: approvedCount ?? 0,
    rejected: rejectedCount ?? 0,
    cancelled: cancelledCount ?? 0,
  }

  const cards = [
    { label: "Total", value: counts.total,     bg: "bg-gray-50",    border: "border-gray-200",  accent: "bg-gray-100",   icon: <ListChecks size={18} color="#374151" /> },
    { label: "Pending", value: counts.pending,  bg: "bg-yellow-50",  border: "border-yellow-200",accent: "bg-yellow-100", icon: <Clock size={18} color="#b45309" /> },
    { label: "Approved", value: counts.approved,bg: "bg-green-50",   border: "border-green-200", accent: "bg-green-100",  icon: <CheckCircle size={18} color="#15803d" /> },
    { label: "Rejected", value: counts.rejected,bg: "bg-red-50",     border: "border-red-200",   accent: "bg-red-100",    icon: <XCircle size={18} color="#dc2626" /> },
    { label: "Cancelled", value: counts.cancelled, bg: "bg-gray-100", border: "border-gray-200", accent: "bg-gray-200",   icon: <XCircle size={18} color="#4b5563" /> },
  ]

  return (
    <View className="flex-row gap-2 flex-wrap mb-3">
      {cards.map(card => (
        <View
          key={card.label}
          className={`flex-1 min-w-[30%] border rounded-xl p-3 ${card.bg} ${card.border}`}
          style={{ minWidth: 90 }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-gray-500">{card.label}</Text>
            <View className={`w-7 h-7 rounded-full items-center justify-center ${card.accent}`}>
              {card.icon}
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-900">{card.value}</Text>
        </View>
      ))}
    </View>
  )
}
