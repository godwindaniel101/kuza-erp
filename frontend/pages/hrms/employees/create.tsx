import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';

export default function CreateEmployeePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeNumber: '',
    departmentId: '',
    positionId: '',
    locationId: '',
    hireDate: '',
    // Bank Account Information
    bankName: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    bankAccountType: '',
    bankAccountHolderName: '',
    bankSwiftCode: '',
    bankIban: '',
    paymentMethod: '',
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [deptsRes, posRes, locsRes] = await Promise.all([
        api.get('/hrms/departments').catch(() => ({ success: false, data: [] })),
        api.get('/hrms/positions').catch(() => ({ success: false, data: [] })),
        api.get('/hrms/locations').catch(() => ({ success: false, data: [] })),
      ]);

      if (deptsRes.success) setDepartments(deptsRes.data);
      if (posRes.success) setPositions(posRes.data);
      if (locsRes.success) setLocations(locsRes.data);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/hrms/employees', formData);
      router.push('/hrms/employees');
    } catch (err) {
      console.error('Failed to create employee:', err);
      alert(t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="employees.create">
      <div className="w-full max-w-3xl space-y-5">
        <PageHeader
          title={<>{t('create')} {t('employee')}</>}
          subtitle="Add a new person to your team"
          breadcrumbs={[
            { label: 'HR', href: '/hrms/dashboard' },
            { label: t('employees') || 'Employees', href: '/hrms/employees' },
            { label: t('create') || 'Create' },
          ]}
        />

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              type="text"
              name="firstName"
              label={t('firstName')}
              required
              value={formData.firstName}
              onChange={(value) => setFormData({ ...formData, firstName: value })}
            />
            <FormField
              type="text"
              name="lastName"
              label={t('lastName')}
              required
              value={formData.lastName}
              onChange={(value) => setFormData({ ...formData, lastName: value })}
            />
            <FormField
              type="email"
              name="email"
              label={t('email')}
              required
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
            />
            <FormField
              type="text"
              name="phone"
              label={t('phone')}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              inputProps={{ type: 'tel' }}
            />
            <FormField
              type="text"
              name="employeeNumber"
              label={t('employeeNumber')}
              value={formData.employeeNumber}
              onChange={(value) => setFormData({ ...formData, employeeNumber: value })}
            />
            <FormField
              type="date"
              name="hireDate"
              label={t('hireDate')}
              value={formData.hireDate}
              onChange={(value) => setFormData({ ...formData, hireDate: value })}
            />
            <FormField
              type="select"
              name="departmentId"
              label={t('department')}
              value={formData.departmentId}
              onChange={(value) => setFormData({ ...formData, departmentId: value })}
              placeholder={t('selectDepartment')}
              options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
            />
            <FormField
              type="select"
              name="positionId"
              label={t('position')}
              value={formData.positionId}
              onChange={(value) => setFormData({ ...formData, positionId: value })}
              placeholder={t('selectPosition')}
              options={positions.map((pos) => ({ value: pos.id, label: pos.title }))}
            />
            <FormField
              type="select"
              name="locationId"
              label={t('location')}
              value={formData.locationId}
              onChange={(value) => setFormData({ ...formData, locationId: value })}
              placeholder={t('selectLocation')}
              options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
            />
          </div>

          {/* Bank Account Information Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('bankAccountInformation') || 'Bank Account Information'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                type="text"
                name="bankName"
                label={t('bankName') || 'Bank Name'}
                value={formData.bankName}
                onChange={(value) => setFormData({ ...formData, bankName: value })}
              />
              <FormField
                type="text"
                name="bankAccountNumber"
                label={t('accountNumber') || 'Account Number'}
                value={formData.bankAccountNumber}
                onChange={(value) => setFormData({ ...formData, bankAccountNumber: value })}
              />
              <FormField
                type="text"
                name="bankRoutingNumber"
                label={t('routingNumber') || 'Routing Number'}
                value={formData.bankRoutingNumber}
                onChange={(value) => setFormData({ ...formData, bankRoutingNumber: value })}
              />
              <FormField
                type="select"
                name="bankAccountType"
                label={t('accountType') || 'Account Type'}
                value={formData.bankAccountType}
                onChange={(value) => setFormData({ ...formData, bankAccountType: value })}
                placeholder={t('selectAccountType') || 'Select Account Type'}
                options={[
                  { value: 'checking', label: t('checking') || 'Checking' },
                  { value: 'savings', label: t('savings') || 'Savings' },
                ]}
              />
              <FormField
                type="text"
                name="bankAccountHolderName"
                label={t('accountHolderName') || 'Account Holder Name'}
                value={formData.bankAccountHolderName}
                onChange={(value) => setFormData({ ...formData, bankAccountHolderName: value })}
              />
              <FormField
                type="select"
                name="paymentMethod"
                label={t('paymentMethod') || 'Payment Method'}
                value={formData.paymentMethod}
                onChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                placeholder={t('selectPaymentMethod') || 'Select Payment Method'}
                options={[
                  { value: 'bank_transfer', label: t('bankTransfer') || 'Bank Transfer' },
                  { value: 'check', label: t('check') || 'Check' },
                  { value: 'cash', label: t('cash') || 'Cash' },
                ]}
              />
              <FormField
                type="text"
                name="bankSwiftCode"
                label={t('swiftCode') || 'SWIFT Code (Optional)'}
                value={formData.bankSwiftCode}
                onChange={(value) => setFormData({ ...formData, bankSwiftCode: value })}
                placeholder="e.g. CHASUS33"
              />
              <FormField
                type="text"
                name="bankIban"
                label={t('iban') || 'IBAN (Optional)'}
                value={formData.bankIban}
                onChange={(value) => setFormData({ ...formData, bankIban: value })}
                placeholder="e.g. GB82WEST12345698765432"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

