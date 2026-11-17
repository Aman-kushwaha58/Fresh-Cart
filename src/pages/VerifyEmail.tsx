import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailToken, resendVerification, user } = useAuth();

  const token = searchParams.get('token');
  const initialEmail =
    (location.state as any)?.email ||
    searchParams.get('email') ||
    user?.email ||
    '';
  const initialVerifyPath = (location.state as any)?.verificationPath || '';

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [message, setMessage] = useState('');
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [verifyPath, setVerifyPath] = useState(initialVerifyPath);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    (async () => {
      setStatus('verifying');
      try {
        const res = await verifyEmailToken(token);
        if (!active) return;
        setStatus('success');
        setMessage(res.message);
        toast.success('Email verified successfully!');
      } catch (err: any) {
        if (!active) return;
        setStatus('error');
        setMessage(err?.message || 'Verification link is invalid or expired.');
      }
    })();

    return () => {
      active = false;
    };
  }, [token, verifyEmailToken]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Please enter your registered email address.');
      return;
    }
    setResending(true);
    try {
      const res = await resendVerification(emailInput.trim());
      toast.success(res.message);
      if (res.verificationPath) {
        setVerifyPath(res.verificationPath);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {status === 'verifying' && (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#16A34A] mx-auto" />
            <h1 className="font-display text-xl font-bold text-gray-900">
              Verifying your email address...
            </h1>
            <p className="text-sm text-gray-500">
              Please wait a moment while we activate your FreshCart account.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-4 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-[#16A34A] mx-auto" />
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Email Verified
            </h1>
            <p className="text-sm text-gray-600">{message}</p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/products')}>
                Start Shopping Groceries
              </Button>
              <Button variant="outline" asChild>
                <Link to="/profile">Go to My Profile</Link>
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4 space-y-4">
            <XCircle className="h-12 w-12 text-red-600 mx-auto" />
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Verification Failed
            </h1>
            <p className="text-sm text-red-700">{message}</p>
            <Button variant="outline" onClick={() => setStatus('idle')}>
              Request New Verification Link
            </Button>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-green-50 p-3 text-[#16A34A] shrink-0">
                <MailCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Verify your email address
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  To protect your account and orders, please verify your email before checking out or managing orders.
                </p>
              </div>
            </div>

            {verifyPath && (
              <div className="rounded-xl border border-green-200 bg-green-50/70 p-4 space-y-3">
                <p className="text-xs font-semibold text-[#15803D]">
                  Verification Email Ready
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Click the verification link below to confirm{' '}
                  <strong>{emailInput || 'your email address'}</strong> and activate your session immediately:
                </p>
                <Button asChild className="w-full">
                  <Link to={verifyPath}>Verify Email Now</Link>
                </Button>
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-gray-100">
              <Label htmlFor="verify-email-input">
                Need a new verification link?
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                />
                <Button type="submit" variant="outline" disabled={resending}>
                  {resending ? 'Sending...' : 'Resend'}
                </Button>
              </div>
            </form>

            <p className="text-center text-xs text-gray-500">
              Already verified?{' '}
              <Link to="/login" className="font-semibold text-[#16A34A] hover:underline">
                Sign in to your account
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
