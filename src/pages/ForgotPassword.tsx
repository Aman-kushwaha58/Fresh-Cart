import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { apiRequest } from '../services/api.ts';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetToken = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [resetPath, setResetPath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; resetPath?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      toast.success(res.message);
      if (res.resetPath) {
        setResetPath(res.resetPath);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to process request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      toast.success(res.message);
      setResetDone(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#16A34A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>

        {resetToken ? (
          resetDone ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-[#16A34A] mx-auto" />
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Password Updated
              </h1>
              <p className="text-sm text-gray-600">
                Your FreshCart password has been reset. You can now sign in with your new credentials.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Sign In Now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Set a new password
                </h1>
                <p className="text-sm text-gray-500">
                  Choose a strong password with at least 8 characters, one uppercase letter, and one number.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-green-50 p-3 text-[#16A34A] shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Reset your password
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your account email and we will prepare a secure password reset link.
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending Link...' : 'Send Password Reset Link'}
              </Button>
            </form>

            {resetPath && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-[#15803D]">
                  Reset Link Ready
                </p>
                <p className="text-xs text-gray-700">
                  Continue below to set a new password for {email}:
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to={resetPath}>Set New Password</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
