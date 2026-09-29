export type Category = 'All' | 'Attendance' | 'Salary' | 'Docs';

export type DetailRow = {
  label:      string;
  value:      string;
  valueColor?: string;   // optional color for value (e.g. green for "Credited")
};

export type NotificationDetail = {
  sender:     string;
  senderIcon: string;
  senderIconBg:    string;
  senderIconColor: string;
  recipient:  string;
  timestamp:  string;
  message:    string;    // bold body paragraph
  rows:       DetailRow[];
  footer?:    string;    // small note at bottom
};

export type Notification = {
  id:        string;
  category:  Exclude<Category, 'All'>;
  icon:      string;
  iconBg:    string;
  iconColor: string;
  title:     string;
  time:      string;
  subtitle:  string;
  body:      string;
  starred:   boolean;
  read:      boolean;
  detail:    NotificationDetail;
};

export const TABS: Category[] = ['All', 'Attendance', 'Salary', 'Docs'];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id:        '1',
    category:  'Attendance',
    icon:      'shield-checkmark-outline',
    iconBg:    'bg-green-500',
    iconColor: '#ffffff',
    title:     'Gate status',
    time:      '2m',
    subtitle:  'Cleared to work — Wed, 16 Sept',
    body:      'B shift, 14:00-22:00, Gate 3, Plant 2 — entry approved.',
    starred:   false,
    read:      false,
    detail: {
      sender:          'Gate Security',
      senderIcon:      'shield-checkmark-outline',
      senderIconBg:    '#dcfce7',
      senderIconColor: '#16a34a',
      recipient:       'You',
      timestamp:       '10:30 AM',
      message:         'You have been cleared to work at Gate 3, Plant 2.',
      rows: [
        { label: 'Shift',    value: 'B shift' },
        { label: 'Time',     value: '14:00 – 22:00' },
        { label: 'Gate',     value: 'Gate 3, Plant 2' },
        { label: 'Status',   value: 'Cleared', valueColor: '#16a34a' },
      ],
      footer: 'Contact your supervisor if you face any access issues at the gate.',
    },
  },
  {
    id:        '2',
    category:  'Salary',
    icon:      'document-text-outline',
    iconBg:    'bg-blue-100',
    iconColor: '#3b82f6',
    title:     'Salary',
    time:      '1h',
    subtitle:  'Salary credited',
    body:      'Aug wages of ₹18,200 sent to your account ending 4521.',
    starred:   false,
    read:      false,
    detail: {
      sender:          'Payroll system',
      senderIcon:      'document-text-outline',
      senderIconBg:    '#dbeafe',
      senderIconColor: '#3b82f6',
      recipient:       'Sathish Sinha D',
      timestamp:       '10:42 AM',
      message:         'Your August wages have been credited.',
      rows: [
        { label: 'Amount',     value: '₹18,200' },
        { label: 'Pay period', value: '1 Aug – 31 Aug 2026' },
        { label: 'Account',    value: 'XXXX 4821' },
        { label: 'Status',     value: 'Credited', valueColor: '#16a34a' },
      ],
      footer: 'Check your payslip in Salary++ for a full breakdown of deductions and bonuses.',
    },
  },
  {
    id:        '3',
    category:  'Attendance',
    icon:      'time-outline',
    iconBg:    'bg-slate-100',
    iconColor: '#64748b',
    title:     'Attendance',
    time:      'Yesterday',
    subtitle:  'Attendance marked',
    body:      'Face punch recorded at 13:58.',
    starred:   false,
    read:      true,
    detail: {
      sender:          'Attendance system',
      senderIcon:      'time-outline',
      senderIconBg:    '#f1f5f9',
      senderIconColor: '#64748b',
      recipient:       'You',
      timestamp:       '13:58',
      message:         'Your attendance has been successfully marked for today.',
      rows: [
        { label: 'Date',      value: '15 Sept 2026' },
        { label: 'Punch time', value: '13:58' },
        { label: 'Method',    value: 'Face recognition' },
        { label: 'Status',    value: 'Marked', valueColor: '#16a34a' },
      ],
      footer: 'If this punch was not made by you, contact HR immediately.',
    },
  },
  {
    id:        '4',
    category:  'Docs',
    icon:      'document-outline',
    iconBg:    'bg-slate-100',
    iconColor: '#64748b',
    title:     'Documents',
    time:      '2d',
    subtitle:  'Document approved',
    body:      'Your leave application was approved.',
    starred:   false,
    read:      true,
    detail: {
      sender:          'HR Department',
      senderIcon:      'document-outline',
      senderIconBg:    '#f1f5f9',
      senderIconColor: '#64748b',
      recipient:       'You',
      timestamp:       '9:15 AM',
      message:         'Your leave application has been reviewed and approved.',
      rows: [
        { label: 'Leave type',  value: 'Casual leave' },
        { label: 'Duration',    value: '18 Sept – 20 Sept 2026' },
        { label: 'Days',        value: '3 days' },
        { label: 'Status',      value: 'Approved', valueColor: '#16a34a' },
      ],
      footer: 'Your leave balance has been updated. View it in the Leave section.',
    },
  },
];
