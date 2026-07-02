import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import AutoStatusUpdate from '@/components/ui/auto-status-update';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { usePostRequest } from '@/hooks/api/usePostRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const WITHDRAWAL_COMMAND_URL = process.env.EXPO_PUBLIC_EWA_WITHDRAWAL_COMMAND_URL ?? 'EWA_withdrawal_application';
const WITHDRAWAL_COLLECTION_NAME =
  process.env.EXPO_PUBLIC_EWA_WITHDRAWAL_COLLECTION_NAME ?? 'EWA_withdrawal_application';
const EWA_ALLOWED_WITHDRAWAL_COMMAND_URL =
  process.env.EXPO_PUBLIC_EWA_ALLOWED_WITHDRAWAL_COMMAND_URL ?? 'EWA_allowed_withdrawl';
const EWA_ALLOWED_WITHDRAWAL_COLLECTION_NAME =
  process.env.EXPO_PUBLIC_EWA_ALLOWED_WITHDRAWAL_COLLECTION_NAME ?? 'EWA_allowed_withdrawl';

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatCurrency(value?: unknown) {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;

  if (Number.isNaN(numericValue)) return 'Rs. 0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numericValue)
    .replace(/₹|â‚¹/g, 'Rs. ');
}

function resolveRecordId(record: Record<string, any> | null) {
  if (!record) return null;
  return record.id ?? record._id ?? record.ID ?? record.Id ?? null;
}

function resolveRequestReference(record: Record<string, any> | null) {
  if (!record) return null;
  return record._id ?? null;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentISOString() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.00${sign}${offsetHours}:${offsetMins}`;
}

export default function LiteInformationScreen() {
  const router = useRouter();
  const isRedirectingRef = useRef(false);
  const pendingWithdrawalAmount = useRef(0);
  const pendingRequestReference = useRef<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [ewaSummary, setEwaSummary] = useState<Record<string, any> | null>(null);
  const [successState, setSuccessState] = useState<{
    amount: number;
    reason: string;
    reference: string;
    workflowState?: unknown;
    _id: string;
  } | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [showAutoStatus, setShowAutoStatus] = useState(false);

  const resetFormState = useCallback(() => {
    setSuccessState(null);
    setAmount('');
    setReason('');
    setError('');
    setConfirmed(false);
    setCreatedRequestId(null);
    setShowAutoStatus(false);
    pendingRequestReference.current = null;
    pendingWithdrawalAmount.current = 0;
  }, []);

  const redirectToLogin = useCallback(() => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    resetFormState();
    router.replace('/login');
  }, [resetFormState, router]);

  useFocusEffect(
    useCallback(() => {
      resetFormState();
      return () => { resetFormState(); };
    }, [resetFormState])
  );

  const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const availableAmount =
    typeof ewaSummary?.available === 'number'
      ? ewaSummary.available
      : typeof ewaSummary?.available === 'string' && ewaSummary.available.trim() !== ''
        ? Number(ewaSummary.available)
        : 0;
  const availableBalance = useMemo(() => formatCurrency(ewaSummary?.available), [ewaSummary]);
  const recordId = useMemo(() => resolveRecordId(ewaSummary), [ewaSummary]);
  const amountError =
    numericAmount > 0 && numericAmount > availableAmount
      ? `Amount cannot be greater than available balance (${availableBalance}).`
      : '';

  const { post: updateAllowedWithdrawal, loading: updatingAllowedWithdrawal } = usePostRequest<any>({
    url: EWA_ALLOWED_WITHDRAWAL_COMMAND_URL,
    onSuccess: (response) => {
      setError('');
      setSuccessState({
        amount: pendingWithdrawalAmount.current,
        reason: reason.trim(),
        reference: pendingRequestReference.current ?? `WR-${Date.now()}`,
        workflowState:
          (response as Record<string, any>)?.workflowState ??
          (response as Record<string, any>)?.data?.workflowState,
        _id: (response as Record<string, any>)?._id ?? '',
      });
      setAmount('');
      setReason('');
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      setShowAutoStatus(false);
      void refetchAvailableBalance();
    },
    onError: (postError) => {
      const message = postError.message || 'Available amount update failed';
      setError(message);
      setSuccessState(null);
      setShowAutoStatus(false);
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      redirectToLogin();
    },
  });

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) { redirectToLogin(); return; }

      const payload = decodeJwtPayload(token);
      if (!payload) { redirectToLogin(); return; }

      const resolvedEmployeeId =
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') || '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      if (!resolvedEmployeeId || !resolvedTenantCode) { redirectToLogin(); return; }

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, [redirectToLogin]);

  const { refetch: refetchAvailableBalance } = useGetRequest<any[]>({
    url: 'EWA_allowed_withdrawl/search',
    method: 'POST',
    data: [
      { field: 'employeeID', value: employeeId, operator: 'eq' },
      { field: 'tenantCode', value: tenantCode, operator: 'eq' },
    ],
    enabled: Boolean(employeeId && tenantCode),
    dependencies: [employeeId, tenantCode],
    onSuccess: (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setEwaSummary(data[0]);
      } else {
        setEwaSummary(null);
      }
    },
    onError: () => {
      setEwaSummary(null);
      redirectToLogin();
    },
  });

  const { post: createWithdrawalRequest, loading: creatingWithdrawalRequest, data } = usePostRequest<any>({
    url: WITHDRAWAL_COMMAND_URL,
    onSuccess: async (response) => {
      const requestReference = resolveRequestReference(response as Record<string, any>);
      pendingRequestReference.current = requestReference;
      setCreatedRequestId(requestReference);
      setShowAutoStatus(Boolean(requestReference));

      if (!recordId) {
        setError('Withdrawal request submitted, but available balance record was not found.');
        setSuccessState(null);
        pendingRequestReference.current = null;
        pendingWithdrawalAmount.current = 0;
        return;
      }

      const updatePayload = {
        tenant: tenantCode,
        action: 'update',
        id: recordId,
        collectionName: EWA_ALLOWED_WITHDRAWAL_COLLECTION_NAME,
        data: {
          ...ewaSummary,
          employeeID: employeeId,
          available: Math.max(availableAmount - pendingWithdrawalAmount.current, 0),
          tenantCode,
        },
      };

      // await updateAllowedWithdrawal(updatePayload);
    },
    onError: (postError) => {
      const message = postError.message || 'Withdrawal request failed';
      setError(message);
      setSuccessState(null);
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      redirectToLogin();
    },
  });

  const isSubmitting = creatingWithdrawalRequest || updatingAllowedWithdrawal;

  const handleSubmit = async () => {
    if (!employeeId || !tenantCode) {
      setError('Employee details are not available yet. Please try again in a moment.');
      return;
    }
    if (!recordId) {
      setError('Available balance record was not found for this employee.');
      return;
    }
    if (numericAmount <= 0) {
      setError('Enter a valid withdrawal amount.');
      return;
    }
    if (amountError) {
      setError(amountError);
      return;
    }

    const payload = {
      tenant: tenantCode,
      action: 'insert',
      id: null,
      event: 'application',
      collectionName: WITHDRAWAL_COLLECTION_NAME,
      data: {
        employeeID: employeeId,
        reason: reason.trim(),
        amount: numericAmount,
        date: getTodayDate(),
        workflowName: 'ewa Application',
        stateEvent: 'NEXT',
        workflowState: 'INITIATED',
        createdOn: getCurrentISOString(),
        available: availableAmount,
        createdBy: employeeId,
        organizationCode: tenantCode,
        uploadedBy: employeeId,
        uploadTime: getCurrentISOString(),
        tenantCode,
        appliedDate: getTodayDate(),
      },
    };

    setError('');
    pendingWithdrawalAmount.current = numericAmount;
    await createWithdrawalRequest(payload);
  };

  useEffect(() => {
    setSuccessState(data);
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 bg-[#f8fafc] px-3.5 pt-[58px] pb-6 rounded-t-3xl">
        {successState ? (
          <AnimatedSuccessState
            id={successState._id}
            title="Request submitted"
            message="Your withdrawal request has been created successfully. We will process it as soon as possible."
            referenceLabel="Request ID"
            referenceValue={successState.reference || '-'}
            amountLabel="Amount"
            amountValue={successState.amount}
            balanceLabel="Available Balance"
            balanceValue={availableBalance}
            employeeLabel="Employee ID"
            employeeValue={employeeId || '-'}
            reasonLabel="Reason"
            reasonValue={successState.reason || 'Not provided'}
            workflowState={successState.workflowState}
            buttonLabel="Back to EWA Platform"
            onPressAutoStatus={() => setShowAutoStatus(true)}
            onPressButton={() => {
              resetFormState();
              router.replace('/(tabs-lite)/ewa' as any);
            }}
          />
        ) : showAutoStatus && createdRequestId ? (
          <AutoStatusUpdate
            fileId={createdRequestId}
            onContinue={() => {
              resetFormState();
              router.replace('/(tabs-lite)/ewa' as any);
            }}
            onClose={() => {
              resetFormState();
              router.replace('/(tabs-lite)/ewa' as any);
            }}
          />
        ) : (
          <>
            {/* Top row */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Pressable
                  onPress={() => router.push('/(tabs-lite)/ewa' as any)}
                  hitSlop={8}
                  className="w-[30px] h-[30px] rounded-full items-center justify-center bg-[#e2e8f0]"
                >
                  <Ionicons name="arrow-back" size={18} color="#0f172a" />
                </Pressable>
                <Text className="text-xl font-bold text-[#0f172a]">Withdrawal</Text>
              </View>
              <View className="flex-row items-center" style={{ gap: 14 }}>
                <Ionicons name="notifications-outline" size={18} color="#0f172a" />
                <Ionicons name="settings-outline" size={18} color="#0f172a" />
              </View>
            </View>

            {/* Balance row */}
            <View className="mt-6 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-[#0f172a]">Available Balance</Text>
              <View className="rounded-full bg-[#13206b] px-2.5 py-[5px]">
                <Text className="text-xs font-bold text-white">{availableBalance}</Text>
              </View>
            </View>

            {/* Card */}
            <View className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-3.5">
              <Text className="text-lg font-bold text-[#0f172a] text-center">
                How much do you want to withdraw?
              </Text>
              <Text className="mt-1.5 text-xs text-[#64748b] text-center px-2" style={{ lineHeight: 16 }}>
                Enter the withdrawal amount and reason below to submit your request.
              </Text>

              <View className="h-px bg-[#e2e8f0] my-3.5" />

              <Text className="text-[10px] font-semibold text-[#64748b] mt-3 mb-1.5">Amount</Text>
              <View
                className="flex-row items-center border border-[#e2e8f0] rounded-md bg-[#f8fafc] px-2.5"
                style={{ minHeight: 38, gap: 8 }}
              >
                <TextInput
                  placeholder="Enter amount to withdraw"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-[13px] text-[#0f172a] py-2.5 pr-2"
                  underlineColorAndroid="transparent"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    if (error) setError('');
                  }}
                />
                <Text className="text-[11px] font-semibold text-[#2563eb]" style={{ minWidth: 64, textAlign: 'right' }}>
                  Max Amount
                </Text>
              </View>
              {!!amountError && <Text className="mt-2.5 text-xs text-[#b91c1c]">{amountError}</Text>}
              {!amountError && !!error && <Text className="mt-2.5 text-xs text-[#b91c1c]">{error}</Text>}

              <Text className="text-[10px] font-semibold text-[#64748b] mt-3 mb-1.5">Reason</Text>
              <TextInput
                placeholder="Enter reason"
                placeholderTextColor="#9ca3af"
                className="border border-[#e2e8f0] rounded-md bg-[#f8fafc] px-2.5 py-2.5 text-[13px] text-[#0f172a]"
                style={{ minHeight: 96 }}
                underlineColorAndroid="transparent"
                value={reason}
                onChangeText={(value) => {
                  setReason(value);
                  if (error) setError('');
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Text className="mt-5 text-[10px] text-[#64748b] text-center px-3" style={{ lineHeight: 14 }}>
              The approved amount will be paid to your registered bank account. Read our Terms & Conditions.
            </Text>

            {numericAmount > 0 ? (
              <>
                <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
                  <Pressable onPress={() => setConfirmed(!confirmed)} className="p-1">
                    <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={20} color="#0f172a" />
                  </Pressable>
                  <Text className="flex-1 text-xs text-[#0f172a]">
                    I confirm this withdrawal request and agree to the terms.
                  </Text>
                </View>
                {confirmed && (
                  <Pressable
                    className="mt-3 h-11 w-full rounded-md bg-[#13206b] items-center justify-center"
                    style={isSubmitting ? { opacity: 0.7 } : undefined}
                    onPress={handleSubmit}
                    disabled={isSubmitting || Boolean(amountError)}
                  >
                    <Text className="text-[15px] font-bold text-white">
                      {isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
