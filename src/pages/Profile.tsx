import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogOut, MapPin, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../services/api.ts';
import { orderService } from '../services/orderService.ts';
import { formatCurrency, formatDate } from '../utils/format.ts';

export default function Profile() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    houseNumber: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => orderService.getAddresses(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderService.getMyOrders(),
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone }),
      });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const addAddressMutation = useMutation({
    mutationFn: () =>
      orderService.createAddress({
        ...addrForm,
        isDefault: addresses.length === 0,
      }),
    onSuccess: () => {
      toast.success('Delivery address saved');
      setShowAddAddress(false);
      setAddrForm({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        houseNumber: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
      });
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save address.');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => orderService.deleteAddress(id),
    onSuccess: () => {
      toast.success('Address removed');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
            Account Profile
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.email} · Role: <span className="capitalize font-medium">{user?.role}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile Info + Password */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-gray-900">
              <UserIcon className="h-5 w-5 text-[#16A34A]" />
              <h2>Personal Details</h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input id="profile-email" value={user?.email || ''} disabled />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5678"
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-gray-900">
              <KeyRound className="h-5 w-5 text-[#16A34A]" />
              <h2>Change Password</h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current-pw">Current Password</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required for email accounts"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
            </div>

            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>

        {/* Right Column: Saved Addresses + Order History Summary */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-lg font-bold text-gray-900">
                <MapPin className="h-5 w-5 text-[#16A34A]" />
                <h2>Saved Delivery Addresses</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddAddress((s) => !s)}
              >
                <Plus className="h-4 w-4" />
                <span>Add Address</span>
              </Button>
            </div>

            {showAddAddress && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Recipient name"
                    value={addrForm.fullName}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={addrForm.phone}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="House / Apt #"
                    value={addrForm.houseNumber}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, houseNumber: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Postal Code"
                    value={addrForm.postalCode}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, postalCode: e.target.value }))
                    }
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Street Address"
                    value={addrForm.address}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="City"
                    value={addrForm.city}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="State"
                    value={addrForm.state}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, state: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addAddressMutation.mutate()}
                    disabled={addAddressMutation.isPending}
                  >
                    Save Address
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {addresses.length === 0 ? (
              <p className="text-sm text-gray-500">
                No saved delivery addresses yet. Add one above or save during checkout.
              </p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {addr.fullName} · {addr.phone}
                      </p>
                      <p className="text-gray-600 mt-0.5">
                        {addr.houseNumber}, {addr.address}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete address"
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-gray-900">
                Recent Orders
              </h2>
              <Link
                to="/orders"
                className="text-xs font-semibold text-[#16A34A] hover:underline"
              >
                View All ({orders.length})
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">No recent orders.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.slice(0, 4).map((o) => (
                  <div
                    key={o.id}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-mono-nums font-semibold text-gray-900">
                        {o.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-mono-nums font-bold text-gray-900">
                        {formatCurrency(o.totalAmount)}
                      </p>
                      <OrderStatusBadge status={o.orderStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
