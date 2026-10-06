import { useGetRequest } from "@/hooks/api/useGetRequest"
import { CheckCircle, Clock, ListChecks, XCircle } from "lucide-react-native"
import React, { useEffect } from "react"
import { Text, View } from "react-native"


interface SummaryCardsProps {
  refreshTrigger?: number
}

export default function ApplicationSummaryCards({ refreshTrigger }: SummaryCardsProps) {
  const base: any[] = []

  const enabled = true

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
    refetchTotal(); refetchPending(); refetchApproved(); refetchRejected(); refetchCancelled()
  }, [refreshTrigger])

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
