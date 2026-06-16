import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Smartphone } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { isNative } from '@/lib/platform';
import rippleLogo from '@/assets/ripple-logo.png';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';



type Step = 'welcome' | 'phone' | 'otp';

const AuthPage = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'OTP Sent', description: `A code has been sent to +91${phone}` });
      setStep('otp');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      toast({
        title: 'Failed to send OTP',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code: otp },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { user_id, roles, profile, session } = data;

      // Set the Supabase session so RLS policies work
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      login(user_id, phone, roles || ['creator'], profile);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      toast({
        title: 'Verification failed',
        description: err.message || 'Invalid or expired OTP',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <SEO
        title="Sign in to Ripple — for the little moments of everyday life"
        description="Join Ripple to share genuine recommendations, reviews and the everyday moments worth sharing. Phone sign-in, no spam."
        path="/auth"
      />
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-background" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 pt-24">
                <motion.img
                  src={rippleLogo}
                  alt="Ripple logo"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-20 h-20 rounded-3xl mb-6 shadow-lg"
                />
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-extrabold tracking-tight text-foreground text-center"
                >
                  Ripple
                </motion.h1>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground text-center mt-3 text-lg"
                >
                  For the little moments of everyday life
                </motion.p>
              </div>
            </div>

            <div className="px-6 pb-12 space-y-3">
              <button
                onClick={() => setStep('phone')}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              >
                <Phone className="w-5 h-5" />
                Continue with phone
              </button>
              <button
                onClick={async () => {
                  try {
                    const result = await lovable.auth.signInWithOAuth('google', {
                      redirect_uri: window.location.origin,
                    });
                    if (result.error) {
                      toast({ title: 'Google sign-in failed', description: result.error.message || 'Please try again', variant: 'destructive' });
                      return;
                    }
                    if (result.redirected) return;
                    navigate('/', { replace: true });
                  } catch (err: any) {
                    toast({ title: 'Google sign-in failed', description: err?.message || 'Please try again', variant: 'destructive' });
                  }
                }}
                className="w-full py-4 rounded-2xl bg-card border-2 border-border text-foreground font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                Continue with Google
              </button>
              <button
                onClick={async () => {
                  try {
                    if (isNative()) {
                      // Native iOS: use system Sign in with Apple sheet
                      const { AppleSignIn, SignInScope } = await import('@capawesome/capacitor-apple-sign-in');
                      // Generate a nonce for the id-token exchange
                      const nonceBytes = new Uint8Array(16);
                      crypto.getRandomValues(nonceBytes);
                      const rawNonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
                      const hashedNonce = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
                      const res = await AppleSignIn.signIn({
                        scopes: [SignInScope.Email, SignInScope.FullName],
                        nonce: hashedNonce,
                      });
                      const idToken = res?.idToken;
                      if (!idToken) {
                        toast({ title: 'Apple sign-in failed', description: 'No identity token returned', variant: 'destructive' });
                        return;
                      }
                      const { error } = await supabase.auth.signInWithIdToken({
                        provider: 'apple',
                        token: idToken,
                        nonce: rawNonce,
                      });
                      if (error) {
                        toast({ title: 'Apple sign-in failed', description: error.message, variant: 'destructive' });
                        return;
                      }
                      navigate('/', { replace: true });
                      return;
                    }
                    // Web: existing Lovable OAuth broker flow
                    const result = await lovable.auth.signInWithOAuth('apple', {
                      redirect_uri: window.location.origin,
                    });
                    if (result.error) {
                      toast({ title: 'Apple sign-in failed', description: result.error.message || 'Please try again', variant: 'destructive' });
                      return;
                    }
                    if (result.redirected) return;
                    navigate('/', { replace: true });
                  } catch (err: any) {
                    // User cancellation on native throws — surface a friendly message
                    const msg = err?.message || String(err);
                    if (/cancel/i.test(msg)) return;
                    toast({ title: 'Apple sign-in failed', description: msg || 'Please try again', variant: 'destructive' });
                  }
                }}

                className="w-full py-4 rounded-2xl bg-foreground text-background font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Continue with Apple
              </button>
            </div>
          </motion.div>
        )}

        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col px-6 pt-16"
          >
            <button onClick={() => setStep('welcome')} className="text-muted-foreground text-sm mb-8">
              ← Back
            </button>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-2">
              Enter your number
            </h2>
            <p className="text-muted-foreground mb-8">
              We'll send you a one-time verification code
            </p>

            <div className="space-y-4 flex-1">
              <div className="flex gap-3">
                <div className="flex items-center px-4 py-4 rounded-2xl bg-secondary text-foreground font-semibold text-lg min-w-[72px] justify-center">
                  +91
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="pb-12">
              <button
                onClick={handleSendOtp}
                disabled={phone.length < 10 || sending}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                {sending ? 'Sending…' : 'Send OTP'}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                By continuing, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-primary underline underline-offset-2 font-medium"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="text-primary underline underline-offset-2 font-medium"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col px-6 pt-16"
          >
            <button onClick={() => setStep('phone')} className="text-muted-foreground text-sm mb-8">
              ← Back
            </button>
            <h2 className="text-3xl font-extrabold text-foreground mb-2">
              Verify your number
            </h2>
            <p className="text-muted-foreground mb-8">
              Enter the 6-digit code sent to +91{phone}
            </p>

            <div className="flex justify-center mb-8">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-xl rounded-xl border-border bg-secondary" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              onClick={() => { setOtp(''); handleSendOtp(); }}
              className="text-primary text-sm font-semibold text-center mb-4"
            >
              Didn't receive the code? Resend
            </button>

            <div className="flex-1" />

            <div className="pb-12">
              <button
                onClick={handleVerifyOtp}
                disabled={otp.length < 6 || verifying}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
