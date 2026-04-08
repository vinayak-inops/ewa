import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedSuccessState } from '@/components/ui/animated-success-state';
import { useGetRequest } from '@/hooks/api/useGetRequest';
import { usePostRequest } from '@/hooks/api/usePostRequest';
import { getAccessToken } from '@/hooks/auth/token-store';

const WITHDRAWAL_COMMAND_URL = process.env.EXPO_PUBLIC_EWA_WITHDRAWAL_COMMAND_URL ?? 'EWA_withdrawl_request';
const WITHDRAWAL_COLLECTION_NAME =
  process.env.EXPO_PUBLIC_EWA_WITHDRAWAL_COLLECTION_NAME ?? 'EWA_withdrawl_request';
const EWA_ALLOWED_WITHDRAWAL_COMMAND_URL =
  process.env.EXPO_PUBLIC_EWA_ALLOWED_WITHDRAWAL_COMMAND_URL ?? 'EWA_allowed_withdrawl';
const EWA_ALLOWED_WITHDRAWAL_COLLECTION_NAME =
  process.env.EXPO_PUBLIC_EWA_ALLOWED_WITHDRAWAL_COLLECTION_NAME ?? 'EWA_allowed_withdrawl';
const APP_FONT_FAMILY = 'Inter';

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
  return new Date().toISOString();
}

export default function LiteInformationScreen() {
  const router = useRouter();
  const isRedirectingRef = useRef(false);
  const pendingWithdrawalAmount = useRef(0);
  const pendingRequestReference = useRef<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [ewaSummary, setEwaSummary] = useState<Record<string, any> | null>(null);
  const [successState, setSuccessState] = useState<{
    amount: number;
    reason: string;
    reference: string;
  } | null>(null);

  const resetFormState = useCallback(() => {
    setSuccessState(null);
    setAmount('');
    setReason('');
    setError('');
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

      return () => {
        resetFormState();
      };
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
      console.log('[allowed_withdrawal] response', response);
      setError('');
      setSuccessState({
        amount: pendingWithdrawalAmount.current,
        reason: reason.trim(),
        reference: pendingRequestReference.current ?? `WR-${Date.now()}`,
      });
      setAmount('');
      setReason('');
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      void refetchAvailableBalance();
    },
    onError: (postError) => {
      const message = postError.message || 'Available amount update failed';
      setError(message);
      setSuccessState(null);
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      console.log('[allowed_withdrawal] error', message);
      redirectToLogin();
    },
  });

  useEffect(() => {
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      const payload = decodeJwtPayload(token);
      if (!payload) {
        redirectToLogin();
        return;
      }

      const resolvedEmployeeId =
        String(payload.employeeID ?? payload.employeeId ?? payload.empId ?? process.env.EXPO_PUBLIC_EMPLOYEE_ID ?? '') ||
        '';
      const resolvedTenantCode =
        String(payload.tenantCode ?? payload.tenant ?? payload.org ?? process.env.EXPO_PUBLIC_TENANT_CODE ?? '') || '';

      if (!resolvedEmployeeId || !resolvedTenantCode) {
        redirectToLogin();
        return;
      }

      setEmployeeId(resolvedEmployeeId);
      setTenantCode(resolvedTenantCode);
    };

    void run();
  }, [redirectToLogin]);

  const { refetch: refetchAvailableBalance } = useGetRequest<any[]>({
    url: 'EWA_allowed_withdrawl/search',
    method: 'POST',
    data: [
      {
        field: 'employeeID',
        value: employeeId,
        operator: 'eq',
      },
      {
        field: 'tenantCode',
        value: tenantCode,
        operator: 'eq',
      },
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

  const { post: createWithdrawalRequest, loading: creatingWithdrawalRequest } = usePostRequest<any>({
    url: WITHDRAWAL_COMMAND_URL,
    onSuccess: async (response) => {
      console.log('[withdrawal] response', response);
      pendingRequestReference.current = resolveRequestReference(response as Record<string, any>);

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

      console.log('[allowed_withdrawal] payload', updatePayload);
      await updateAllowedWithdrawal(updatePayload);
    },
    onError: (postError) => {
      const message = postError.message || 'Withdrawal request failed';
      setError(message);
      setSuccessState(null);
      pendingRequestReference.current = null;
      pendingWithdrawalAmount.current = 0;
      console.log('[withdrawal] error', message);
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
      collectionName: WITHDRAWAL_COLLECTION_NAME,
      data: {
        employeeID: employeeId,
        reason: reason.trim(),
        amount: numericAmount,
        date: getTodayDate(),
        createdOn: getCurrentISOString(),
        available: availableAmount,
        organizationCode: tenantCode,
        tenantCode,
      },
    };

    console.log('[withdrawal] payload', payload);
    setError('');
    pendingWithdrawalAmount.current = numericAmount;
    await createWithdrawalRequest(payload);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.phoneFrame}>
        {successState ? (
          <AnimatedSuccessState
            title="Request submitted"
            message="Your withdrawal request has been created successfully. We will process it as soon as possible."
            referenceLabel="Request ID"
            referenceValue={successState.reference || '-'}
            amountLabel="Amount"
            amountValue={formatCurrency(successState.amount)}
            balanceLabel="Available Balance"
            balanceValue={availableBalance}
            employeeLabel="Employee ID"
            employeeValue={employeeId || '-'}
            reasonLabel="Reason"
            reasonValue={successState.reason || 'Not provided'}
            buttonLabel="Back to Launchpad"
            onPressButton={() => {
              resetFormState();
              router.replace('/(tabs-lite)');
            }}
          />
        ) : (
          <>
            <View style={styles.topRow}>
              <View style={styles.leftGroup}>
                <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color="#0f172a" />
                </Pressable>
                <Text style={styles.greeting}>Withdrawal</Text>
              </View>
              <View style={styles.topIcons}>
                <Ionicons name="notifications-outline" size={18} color="#0f172a" />
                <Ionicons name="settings-outline" size={18} color="#0f172a" />
              </View>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{availableBalance}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>How much do you want to withdraw?</Text>
              <Text style={styles.cardSub}>Enter the withdrawal amount and reason below to submit your request.</Text>

              <View style={styles.separator} />

              <Text style={styles.label}>Amount</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder="Enter amount to withdraw"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    if (error) setError('');
                  }}
                />
                <Text style={styles.maxText}>Max Amount</Text>
              </View>
              {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}
              {!amountError && !!error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={styles.label}>Reason</Text>
              <TextInput
                placeholder="Enter reason"
                placeholderTextColor="#9ca3af"
                style={styles.textArea}
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

            <Text style={styles.note}>
              The approved amount will be paid to your registered bank account. Read our Terms & Conditions.
            </Text>

            {numericAmount > 0 ? (
              <Pressable
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || Boolean(amountError)}>
                <Text style={styles.buttonText}>{isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingTop: 58,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  greeting: {
    fontFamily: APP_FONT_FAMILY,
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  titleRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  title: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#13206b',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 14,
  },
  cardTitle: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  cardSub: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 14,
  },
  label: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
    marginTop: 12,
  },
  inputWrap: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    fontFamily: APP_FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 10,
    paddingRight: 8,
  },
  textArea: {
    fontFamily: APP_FONT_FAMILY,
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  maxText: {
    fontFamily: APP_FONT_FAMILY,
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
    minWidth: 64,
    textAlign: 'right',
  },
  errorText: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 10,
    fontSize: 12,
    color: '#b91c1c',
  },
  note: {
    fontFamily: APP_FONT_FAMILY,
    marginTop: 20,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 12,
  },
  button: {
    marginTop: 12,
    height: 44,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#13206b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: APP_FONT_FAMILY,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
