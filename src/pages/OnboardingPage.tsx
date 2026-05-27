import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Check, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Step = 'basics' | 'details';

const STEPS: Step[] = ['basics', 'details'];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'non-binary', label: 'Non-binary', emoji: '🧑' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say', emoji: '🤐' },
];

const OnboardingPage = () => {
  const [step, setStep] = useState<Step>('basics');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userId, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();


  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userId) return null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({ title: 'Failed to upload photo', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const checkUsername = async (val: string) => {
    if (val.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError('Only letters, numbers, and underscores');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', val.toLowerCase())
      .neq('id', userId || '')
      .maybeSingle();
    if (data) {
      setUsernameError('Username already taken');
    } else {
      setUsernameError('');
    }
  };


  const handleFinish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          name,
          gender: gender || null,
          date_of_birth: dob || null,
          city: city.trim() || null,
          onboarding_completed: true,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq('id', userId);

      if (error) throw error;
      completeOnboarding();
      toast({ title: 'Welcome to Ripple! 🎉' });
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error saving profile', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canProceedBasics = username.length >= 3 && !usernameError && name.trim().length > 0;

  const slideVariants = {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                STEPS.indexOf(step) >= i ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'basics' && (
          <motion.div key="basics" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col px-6 pt-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <User className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-1">Let's set up your profile</h2>
            <p className="text-muted-foreground mb-6">Add a photo, choose a username, and tell us your name</p>

            <div className="space-y-4 flex-1">
              {/* Profile photo */}
              <div className="flex flex-col items-center mb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-dashed border-border hover:border-primary transition-colors group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-0.5 group-hover:bg-muted transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Add photo</span>
                    </div>
                  )}
                </button>
                {avatarPreview && (
                  <button
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                    className="mt-2 text-xs text-destructive font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
                <input
                  type="text"
                  placeholder="e.g. cool_shopper"
                  value={username}
                  onChange={e => {
                    const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                    setUsername(v);
                    if (v.length >= 3) checkUsername(v);
                    else setUsernameError(v.length > 0 ? 'Username must be at least 3 characters' : '');
                  }}
                  className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
                {usernameError && <p className="text-destructive text-xs mt-1">{usernameError}</p>}
                {username.length >= 3 && !usernameError && (
                  <p className="text-green-500 text-xs mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Available</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 50))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
              </div>
            </div>

            <div className="pb-12">
              <button
                onClick={() => setStep('details')}
                disabled={!canProceedBasics}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div key="details" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col px-6 pt-8 overflow-y-auto">
            <button onClick={() => setStep('basics')} className="text-muted-foreground text-sm mb-4">← Back</button>
            <h2 className="text-2xl font-extrabold text-foreground mb-1">Tell us about yourself</h2>
            <p className="text-muted-foreground mb-6">This helps personalize your experience</p>

            <div className="space-y-5 flex-1 pb-4">
              {/* Gender */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Gender</label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGender(gender === opt.value ? '' : opt.value)}
                      className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-colors active:scale-95 flex items-center gap-2 ${
                        gender === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground border border-border'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Birthday */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Birthday 🤫</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={e => setCity(e.target.value.slice(0, 60))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
              </div>
            </div>

            <div className="pb-12 pt-4">
              <button
                onClick={handleFinish}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {saving ? 'Setting up…' : 'Get Started 🚀'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingPage;
