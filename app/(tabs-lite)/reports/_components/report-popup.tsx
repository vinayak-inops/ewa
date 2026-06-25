import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAccessToken } from '@/hooks/auth/token-store';
import { BasicInformation } from './basic-information';
import { SelectReports } from './select-reports';
import { StepIndicator } from './step-indicator';
import { TableFilterSection } from './table-filter-section';
import { EMPTY_FILTER_DATA, TableMenuItem, TableType } from './types';

const F = 'Inter';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// ── JWT helpers (same pattern as attendance screen) ───────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tableMenuItems: TableMenuItem[];
  onReset: () => void;
  onFilterDataChange?: (filterData: Record<TableType, string[]>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportPopup({
  isOpen,
  onClose,
  tableMenuItems,
  onReset,
  onFilterDataChange,
}: ReportPopupProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Auth state (from JWT, replaces useSession / useKeyclockRoleInfo / useAuthToken) ──
  const [token, setToken] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');

  useEffect(() => {
    const run = async () => {
      const t = await getAccessToken();
      if (!t) return;
      setToken(t);
      const payload = decodeJwtPayload(t);
      if (!payload) return;
      setEmployeeId(String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? ''));
      setTenantCode(String(payload.tenantCode ?? payload.tenant ?? payload.org ?? ''));
      setUploadedBy(String(payload.name ?? payload.preferred_username ?? payload.sub ?? ''));
    };
    void run();
  }, []);

  // ── Step state ────────────────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [visibleStepLabel, setVisibleStepLabel] = useState<number | null>(null);

  // ── Step 1: report selection ──────────────────────────────────────────────

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedWorkflowName, setSelectedWorkflowName] = useState<string | null>(null);

  // ── Step 2: filter data ───────────────────────────────────────────────────

  const [filterData, setFilterData] = useState<Record<TableType, string[]>>({ ...EMPTY_FILTER_DATA });

  // ── Step 3: basic information ─────────────────────────────────────────────

  const [extension, setExtension] = useState('excel');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetAllState = () => {
    setCurrentStep(1);
    setVisibleStepLabel(null);
    setSelectedReport(null);
    setSelectedWorkflowName(null);
    setExtension('excel');
    setFromDate('');
    setToDate('');
    setPeriod('');
    setReportTitle('');
    setReportDescription('');
    const empty = { ...EMPTY_FILTER_DATA };
    setFilterData(empty);
    onFilterDataChange?.(empty);
    onReset();
  };

  useEffect(() => {
    if (isOpen) resetAllState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    resetAllState();
    onClose();
  };

  // ── Completed steps ───────────────────────────────────────────────────────

  const completedSteps = useMemo(() => {
    const done: number[] = [];
    if (selectedReport) done.push(1);
    if (currentStep >= 3 || Object.values(filterData).some((a) => a.length > 0)) done.push(2);
    return done;
  }, [selectedReport, currentStep, filterData]);

  // ── Filter data handler ───────────────────────────────────────────────────

  const handleFilterDataChange = useCallback((data: Record<TableType, string[]>) => {
    setFilterData(data);
    onFilterDataChange?.(data);
  }, [onFilterDataChange]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token is not available');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalData = {
        report: '',
        tenantCode: tenantCode,
        organization: tenantCode,
        uploadedBy: uploadedBy,
        createdOn: new Date().toISOString(),
        reportName: selectedReport ?? '',
        subsidiaries: filterData.subsidiaries,
        divisions: filterData.divisions,
        location: filterData.locations,
        designations: filterData.designations,
        grades: filterData.grades,
        departments: filterData.departments,
        subDepartments: filterData.subDepartments,
        sections: filterData.sections,
        employeeCategories: filterData.employeeCategories,
        contractor: filterData.contractors,
        workOrderNumber: filterData.workOrders,
        shiftGroups: filterData.shiftGroups,
        shifts: filterData.shifts,
        extension,
        toDate,
        fromDate,
        period,
        reportTitle,
        reportDescription,
        workflowName: selectedWorkflowName ?? 'Report',
        employeeId: employeeId,
        level: 1,
        employeeID: filterData.contractEmployees,
      };

      const response = await fetch(`${API_BASE}/api/command/attendance/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenant: tenantCode,
          action: 'insert',
          id: null,
          collectionName: 'reports',
          event: 'reportGeneration',
          data: finalData,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message ?? 'Failed to submit report');
      }

      // Extract _id from response (array or single object)
      let reportId: string | null = null;
      if (Array.isArray(responseData) && responseData[0]?._id) {
        reportId = responseData[0]._id;
      } else if (responseData?._id) {
        reportId = responseData._id;
      }

      if (reportId && employeeId) {
        // Navigate to the reports screen with mode=all and the report id
        router.push(`/(tabs-lite)/reports/application?mode=all&id=${encodeURIComponent(reportId)}` as any);
        handleClose();
      } else {
        Alert.alert('Success', 'Report submitted successfully!');
        handleClose();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', `Failed to submit report: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>

      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={handleClose} />

      {/* Panel */}
      <View style={[s.panel, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Top bar */}
        <View style={s.topBar}>
          <View>
            <Text style={s.panelTitle}>Generate Report</Text>
            <Text style={s.panelSub}>Step {currentStep} of 3</Text>
          </View>
          <Pressable hitSlop={8} onPress={handleClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color="#334155" />
          </Pressable>
        </View>

        {/* Main split layout: sidebar + content (mirrors web's flex row) */}
        <View style={s.body}>
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            visibleStepLabel={visibleStepLabel}
            onStepChange={(step) => {
              setCurrentStep(step);
            }}
            onStepLabelToggle={(step) => setVisibleStepLabel(visibleStepLabel === step ? null : step)}
            onStepLabelClose={() => setVisibleStepLabel(null)}
          />

          {/* Dismiss floating label when tapping content area */}
          <Pressable style={s.content} onPress={() => setVisibleStepLabel(null)}>
            {currentStep === 1 && (
              <SelectReports
                selectedReport={selectedReport}
                onSelectionChange={(id, workflowName) => {
                  setSelectedReport(id);
                  setSelectedWorkflowName(workflowName ?? null);
                }}
                onSaveAndContinue={() => {
                  if (selectedReport) setCurrentStep(2);
                }}
                searchLabel="Search by Report Title"
                searchPlaceholder="Report title, category, or keyword"
              />
            )}

            {currentStep === 2 && (
              <TableFilterSection
                tableMenuItems={tableMenuItems}
                filterData={filterData}
                onFilterDataChange={handleFilterDataChange}
                onSaveAndContinue={() => setCurrentStep(3)}
              />
            )}

            {currentStep === 3 && (
              <BasicInformation
                extension={extension}
                fromDate={fromDate}
                toDate={toDate}
                period={period}
                reportTitle={reportTitle}
                reportDescription={reportDescription}
                onExtensionChange={setExtension}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onPeriodChange={setPeriod}
                onReportTitleChange={setReportTitle}
                onReportDescriptionChange={setReportDescription}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  panelTitle: {
    fontFamily: F,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  panelSub: {
    fontFamily: F,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
