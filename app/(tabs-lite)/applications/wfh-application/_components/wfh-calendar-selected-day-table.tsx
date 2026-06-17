import { useGetRequest } from "@/hooks/api/useGetRequest"
import { getAccessToken } from "@/hooks/auth/token-store"
import { Filter, Search, X } from "lucide-react-native"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native"
import WfhRequestsPopup from "./wfh-requests-popup"
import WfhTable, { WfhRecord } from "./wfh-table"

function decodeJwtPayload(token: string) {
  try {
    const p = token.split(".")[1]; if (!p) return null
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
    return JSON.parse(decodeURIComponent(atob(padded).split("").map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(""))) as Record<string, unknown>
  } catch { return null }
}

const SEARCH_FIELDS = [
  { value: "employeeID",  label: "Employee ID"  },
  { value: "description", label: "Description"  },
  { value: "uploadedBy",  label: "Uploaded By"  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedDateKey: string
  label?: string
}

export default function WfhCalendarSelectedDayTable({ isOpen, onClose, selectedDateKey, label }: Props) {
  const [records, setRecords] = useState<WfhRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchField, setSearchField] = useState("employeeID")
  const [searchValue, setSearchValue] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [tenantCode, setTenantCode] = useState("")

  const itemsPerPage = 10
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken()
      if (!token) return
      const p = decodeJwtPayload(token)
      if (!p) return
      setTenantCode(String(p.tenantCode ?? p.tenant ?? p.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? "") || "")
    }
    void run()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchValue)
      setCurrentPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchValue])

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("")
      setDebouncedSearch("")
      setCurrentPage(1)
      setShowFieldPicker(false)
    }
  }, [isOpen])

  const offset = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])

  const requestData = useMemo(() => {
    const data: any[] = [
      { field: "tenantCode",     value: tenantCode,       operator: "eq"  },
      { field: "workflowState",  value: "APPROVED",       operator: "eq"  },
      { field: "fromDate",       value: selectedDateKey,  operator: "lte" },
      { field: "toDate",         value: selectedDateKey,  operator: "gte" },
      { field: "createdOn",      value: "",               operator: "desc" },
    ]
    if (debouncedSearch.trim()) data.push({ field: searchField, operator: "like", value: debouncedSearch.trim() })
    return data
  }, [tenantCode, selectedDateKey, searchField, debouncedSearch])

  const { loading, refetch } = useGetRequest<any[]>({
    url: `wfhApplication/search?offset=${offset}&limit=${itemsPerPage}`,
    method: "POST",
    data: requestData,
    onSuccess: (d: any) => {
      if (!d || !Array.isArray(d)) { setRecords([]); return }
      setRecords(d.filter((i: any) => i && typeof i === "object").map((i: any) => ({
        _id: i._id || "", uploadedBy: i.uploadedBy || "", createdOn: i.createdOn || "",
        employeeID: i.employeeID || "", fromDate: i.fromDate || "", toDate: i.toDate || "",
        fromDuration: i.fromDuration || "", toDuration: i.toDuration || "",
        description: i.description || "", workflowState: i.workflowState || "APPROVED",
        status: i.workflowState || "APPROVED",
      })))
    },
    onError: () => {},
  })

  useGetRequest<any>({
    url: "wfhApplication/count",
    method: "POST",
    data: requestData,
    onSuccess: (d: any) => { if (d !== null && d !== undefined) setTotalCount(d || 0) },
    onError: () => {},
  })

  useEffect(() => {
    if (isOpen && tenantCode && selectedDateKey) refetch()
  }, [isOpen, tenantCode, selectedDateKey, currentPage, debouncedSearch, searchField])

  const handleOpenDetails = useCallback((row: any) => {
    if (!row?._id) return
    setSelectedRequestId(row._id)
    setIsDetailOpen(true)
  }, [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
              {label ?? selectedDateKey}
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {totalCount} approved WFH record{totalCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Search Row */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
          <TouchableOpacity
            onPress={() => setShowFieldPicker(v => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}
          >
            <Filter size={13} color="#6b7280" />
            <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>
              {SEARCH_FIELDS.find(f => f.value === searchField)?.label ?? "Field"}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", height: 36, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, gap: 8 }}>
            <Search size={13} color="#9ca3af" />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder={`Search ${SEARCH_FIELDS.find(f => f.value === searchField)?.label.toLowerCase()}...`}
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              style={{ flex: 1, fontSize: 13, color: "#111827" }}
            />
            {searchValue.length > 0 && (
              <TouchableOpacity onPress={() => setSearchValue("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={13} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Field picker dropdown */}
        {showFieldPicker && (
          <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden", zIndex: 10 }}>
            {SEARCH_FIELDS.map(f => (
              <TouchableOpacity
                key={f.value}
                onPress={() => { setSearchField(f.value); setShowFieldPicker(false) }}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb", backgroundColor: searchField === f.value ? "#f0fdf4" : "#fff" }}
              >
                <Text style={{ fontSize: 13, color: searchField === f.value ? "#15803d" : "#374151", fontWeight: searchField === f.value ? "600" : "400" }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Table */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          <WfhTable
            data={records}
            onOpenDetails={handleOpenDetails}
            loading={loading}
            externalPagination={{
              currentPage, totalPages, totalItems: totalCount, itemsPerPage,
              startIndex, endIndex,
              onPageChange: useCallback((p: number) => setCurrentPage(p), []),
            }}
          />
        </View>
      </View>

      {/* Detail popup */}
      <WfhRequestsPopup
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedRequestId(null) }}
        selectedRequestId={selectedRequestId}
        initialSelectedRequest={null}
        userMode="user"
        sourceCollectionName="wfhApplicationTransaction"
        onActionSuccess={() => { refetch() }}
      />
    </Modal>
  )
}
