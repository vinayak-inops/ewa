import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getAccessToken } from '@/hooks/auth/token-store';
import { BasicInformation } from './_components/basic-information';
import { SelectReports } from './_components/select-reports';
import { StepIndicator } from './_components/step-indicator';
import { TableFilterSection } from './_components/table-filter-section';
import { TableMenuItem, EMPTY_FILTER_DATA, TableType } from './_components/types';

const F = 'Inter';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const TABLE_MENU_ITEMS: TableMenuItem[] = [
  { id: 'subsidiaries',       label: 'Subsidiaries',       icon: 'git-branch-outline',   parent: 'organization' },
  { id: 'divisions',          label: 'Divisions',          icon: 'people-outline',        parent: 'organization' },
  { id: 'departments',        label: 'Departments',        icon: 'business-outline',      parent: 'organization' },
  { id: 'subDepartments',     label: 'Sub Departments',    icon: 'business-outline',      parent: 'organization' },
  { id: 'sections',           label: 'Sections',           icon: 'people-outline',        parent: 'organization' },
  { id: 'designations',       label: 'Designations',       icon: 'people-outline',        parent: 'organization' },
  { id: 'grades',             label: 'Grades',             icon: 'people-outline',        parent: 'organization' },
  { id: 'employeeCategories', label: 'Categories',         icon: 'people-outline',        parent: 'organization' },
  { id: 'locations',          label: 'Locations',          icon: 'location-outline',      parent: 'organization' },
  { id: 'contractors',        label: 'Contractors',        icon: 'shield-outline',        parent: 'contractor' },
  { id: 'workOrders',         label: 'Work Orders',        icon: 'document-text-outline', parent: 'contractor' },
  { id: 'shiftGroups',        label: 'Shift Groups',       icon: 'time-outline',          parent: 'shift' },
  { id: 'shifts',             label: 'Shifts',             icon: 'time-outline',          parent: 'shift' },
  { id: 'contractEmployees',  label: 'Contract Employees', icon: 'people-outline',        parent: 'contractEmployee' },
];

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

export default function CreateReportScreen() {
  const router = useRouter();

  // ── Auth ──────────────────────────────────────────────────────────────────
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

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedWorkflowName, setSelectedWorkflowName] = useState<string | null>(null);

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const [filterData, setFilterData] = useState<Record<TableType, string[]>>({ ...EMPTY_FILTER_DATA });

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [extension, setExtension] = useState('excel');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // ── Completed steps ───────────────────────────────────────────────────────
  const completedSteps = useMemo(() => {
    const done: number[] = [];
    if (selectedReport) done.push(1);
    if (currentStep >= 3 || Object.values(filterData).some((a) => a.length > 0)) done.push(2);
    return done;
  }, [selectedReport, currentStep, filterData]);

  // ── Filter handler ────────────────────────────────────────────────────────
  const handleFilterDataChange = useCallback((data: Record<TableType, string[]>) => {
    setFilterData(data);
  }, []);

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
        tenantCode,
        organization: tenantCode,
        uploadedBy,
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
        employeeId,
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
      if (!response.ok) throw new Error(responseData.message ?? 'Failed to submit report');

      let reportId: string | null = null;
      if (Array.isArray(responseData) && responseData[0]?._id) {
        reportId = responseData[0]._id;
      } else if (responseData?._id) {
        reportId = responseData._id;
      }

      if (reportId && employeeId) {
        router.replace(`/(tabs-lite)/reports/application?mode=all&id=${encodeURIComponent(reportId)}` as any);
      } else {
        Alert.alert('Success', 'Report submitted successfully!');
        router.back();
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
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={s.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Generate Report</Text>
          <Text style={s.headerSub}>Step {currentStep} of 3</Text>
        </View>
        <View style={s.headerRight} />
      </View>

      {/* Step indicator */}
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        visibleStepLabel={null}
        onStepChange={setCurrentStep}
        onStepLabelToggle={() => {}}
        onStepLabelClose={() => {}}
      />

      {/* Step content */}
      <View style={s.content}>
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
            tableMenuItems={TABLE_MENU_ITEMS}
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
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: F,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontFamily: F,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    width: 34,
  },
  content: {
    flex: 1,
  },
});
