import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ArrowRight, Phone, Smartphone, ShoppingBag, Store } from 'lucide-react';
import rippleLogo from '@/assets/ripple-logo.png';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';


type Step = 'welcome' | 'phone' | 'otp' | 'role';

const AuthPage = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifyData, setVerifyData] = useState<any>(null);
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

      // Check if user has seller role and needs role selection
      const hasSeller = roles?.includes('seller');
      const isAdmin = roles?.includes('admin');

      if (isAdmin) {
        login(user_id, phone, roles, profile);
        navigate('/');
      } else if (hasSeller) {
        setVerifyData({ user_id, roles, profile });
        setStep('role');
      } else {
        login(user_id, phone, roles || ['shopper'], profile);
        navigate('/');
      }
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

  const handleRoleSelect = (role: 'shopper' | 'seller') => {
    if (verifyData) {
      login(verifyData.user_id, phone, verifyData.roles, verifyData.profile);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
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
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setStep('phone')}
                className="w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg active:scale-[0.98] transition-transform"
              >
                I already have an account
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
                By continuing, you agree to our Terms of Service and Privacy Policy
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

        {step === 'role' && (
          <motion.div
            key="role"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col px-6 pt-16"
          >
            <h2 className="text-3xl font-extrabold text-foreground mb-2">
              Welcome! 🎉
            </h2>
            <p className="text-muted-foreground mb-8">
              How would you like to use Ripple?
            </p>

            <div className="space-y-4 flex-1">
              <button
                onClick={() => handleRoleSelect('shopper')}
                className="w-full p-5 rounded-2xl bg-card border-2 border-border hover:border-primary transition-colors text-left active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-bold text-lg">Shop & Watch</h3>
                    <p className="text-muted-foreground text-sm">Browse livestreams and buy products</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('seller')}
                className="w-full p-5 rounded-2xl bg-card border-2 border-border hover:border-primary transition-colors text-left active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-bold text-lg">Sell & Stream</h3>
                    <p className="text-muted-foreground text-sm">Manage your store and go live</p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
