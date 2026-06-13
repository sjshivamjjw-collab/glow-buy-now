import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Check, Sparkles, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'non-binary', label: 'Non-binary', emoji: '🧑' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say', emoji: '🤐' },
];

const OnboardingPage = () => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { userId, completeOnboarding, updateProfile } = useAuth();
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
    }
  };

  const checkUsername = async (val: string) => {
    if (val.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameAvailable(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError('Only letters, numbers, and underscores');
      setUsernameAvailable(false);
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
      setUsernameAvailable(false);
    } else {
      setUsernameError('');
      setUsernameAvailable(true);
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
          gender: gender || null,
          date_of_birth: dob || null,
          onboarding_completed: true,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        } as any)
        .eq('id', userId);

      if (error) throw error;
      if (avatarUrl) updateProfile({ avatar_url: avatarUrl });
      completeOnboarding();
      toast({ title: 'Welcome to Ripple! 🎉' });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isDuplicateUsername =
        err?.code === '23505' ||
        msg.includes('profiles_username_key') ||
        msg.toLowerCase().includes('duplicate key');
      if (isDuplicateUsername) {
        setUsernameError('Username already taken — please pick another');
        setUsernameAvailable(false);
        toast({
          title: 'Username already taken',
          description: 'Please choose a different username and try again.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Error saving profile', description: msg, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const canFinish = username.length >= 3 && !usernameError && usernameAvailable && !!gender && !!dob;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-10 overflow-y-auto"
      >
        <h2 className="text-2xl font-extrabold text-foreground mb-1">Set up your profile</h2>
        <p className="text-muted-foreground mb-6">Just a few quick details to get you started</p>

        <div className="space-y-5 flex-1 pb-4">
          {/* Profile photo (optional) */}
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
            {avatarPreview ? (
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                className="mt-2 text-xs text-destructive font-medium"
              >
                Remove
              </button>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Optional</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
            <input
              type="text"
              placeholder="e.g. your_username"
              value={username}
              onChange={e => {
                const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                setUsername(v);
                setUsernameAvailable(false);
                if (v.length >= 3) {
                  if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
                  usernameDebounce.current = setTimeout(() => checkUsername(v), 400);
                } else {
                  setUsernameError(v.length > 0 ? 'Username must be at least 3 characters' : '');
                }
              }}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
            />
            {usernameError && <p className="text-destructive text-xs mt-1">{usernameError}</p>}
            {usernameAvailable && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Available</p>
            )}
          </div>

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

          {/* DOB */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Birthday 🎂</label>
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
            />
          </div>
        </div>

        <div className="pb-12 pt-4">
          <button
            onClick={handleFinish}
            disabled={!canFinish || saving}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saving ? 'Setting up…' : (<><Sparkles className="w-5 h-5" /> Get Started</>)}
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">You can update these anytime in Settings</p>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
