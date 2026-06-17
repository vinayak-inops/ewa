import React, { useMemo } from "react"
import { View, Text, ScrollView } from "react-native"
import { CheckCircle, XCircle, Clock, ListChecks } from "lucide-react-native"

interface SummaryCardsProps {
  data: Array<{ status?: string; workflowState?: string }>
  countsOverride?: {
    total: number
    approved: number
    rejected: number
    cancelled: number
    pending: number
  }
}

export default function ApplicationSummaryCards({ data, countsOverride }: SummaryCardsProps) {
  const counts = useMemo(() => {
    if (countsOverride) return countsOverride
    const norm = (s?: string) => (s || "").toString().toUpperCase()
    const total = data.length
    let approved = 0, rejected = 0, cancelled = 0, pending = 0
    for (const row of data) {
      const s = norm(row.status || row.workflowState)
      if (s === "APPROVED") approved++
      else if (s === "REJECTED") rejected++
      else if (s === "CANCELLED" || s === "CANCEL") cancelled++
      else pending++
    }
    return { total, approved, rejected, cancelled, pending }
  }, [data, countsOverride])

  const cards = [
    {
      title: "Total",
      value: counts.total,
      icon: <ListChecks size={18} color="#374151" />,
      bg: "bg-white",
      border: "border-gray-200",
      accent: "bg-gray-100",
    },
    {
      title: "Pending",
      value: counts.pending,
      icon: <Clock size={18} color="#92400e" />,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      accent: "bg-yellow-100",
    },
    {
      title: "Approved",
      value: counts.approved,
      icon: <CheckCircle size={18} color="#1d4ed8" />,
      bg: "bg-blue-50",
      border: "border-blue-200",
      accent: "bg-blue-100",
    },
    {
      title: "Cancelled",
      value: counts.cancelled,
      icon: <XCircle size={18} color="#dc2626" />,
      bg: "bg-red-50",
      border: "border-red-200",
      accent: "bg-red-100",
    },
    {
      title: "Rejected",
      value: counts.rejected,
      icon: <XCircle size={18} color="#b91c1c" />,
      bg: "bg-red-100",
      border: "border-red-200",
      accent: "bg-red-200",
    },
  ]

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
      <View className="flex-row gap-3 px-0 py-2">
        {cards.map((c) => (
          <View
            key={c.title}
            className={`rounded-xl border p-4 ${c.bg} ${c.border}`}
            style={{ width: 120 }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs text-gray-500">{c.title}</Text>
              <View className={`w-8 h-8 rounded-full items-center justify-center ${c.accent}`}>
                {c.icon}
              </View>
            </View>
            <Text className="text-2xl font-semibold text-gray-900">{c.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
