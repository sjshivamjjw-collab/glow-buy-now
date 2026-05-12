import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Plus, Star, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  name: string;
  phone: string | null;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  country: string;
  is_default: boolean;
}

const emptyForm = {
  label: '',
  name: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'India',
  is_default: false,
};

const AddressesPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses((data as Address[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const startCreate = () => {
    setForm({ ...emptyForm, is_default: addresses.length === 0 });
    setEditingId(null);
    setCreating(true);
  };

  const startEdit = (addr: Address) => {
    setForm({
      label: addr.label || '',
      name: addr.name,
      phone: addr.phone || '',
      street: addr.street,
      city: addr.city,
      state: addr.state || '',
      zip: addr.zip || '',
      country: addr.country,
      is_default: addr.is_default,
    });
    setEditingId(addr.id);
    setCreating(true);
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!userId) return;
    const name = form.name.trim();
    const street = form.street.trim();
    const city = form.city.trim();
    if (!name || !street || !city) {
      toast({ title: 'Name, street and city are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      label: form.label.trim() || null,
      name,
      phone: form.phone.trim() || null,
      street,
      city,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
      country: form.country.trim() || 'India',
      is_default: form.is_default,
    };
    const { error } = editingId
      ? await supabase.from('addresses').update(payload).eq('id', editingId)
      : await supabase.from('addresses').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save address', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Address updated' : 'Address added' });
    cancelEdit();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
      return;
    }
    toast({ title: 'Address removed' });
    load();
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Saved Addresses</h1>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {addresses.length === 0 && !creating && (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved addresses yet</p>
              </div>
            )}

            {addresses.map(addr => (
              <div key={addr.id} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {addr.label && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">{addr.label}</span>
                      )}
                      {addr.is_default && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Default
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground text-sm">{addr.name}</p>
                    <p className="text-muted-foreground text-sm leading-snug">
                      {addr.street}, {addr.city}{addr.state ? `, ${addr.state}` : ''}{addr.zip ? ` ${addr.zip}` : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">{addr.country}{addr.phone ? ` · ${addr.phone}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  {!addr.is_default && (
                    <button onClick={() => handleSetDefault(addr.id)} className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5" /> Set Default
                    </button>
                  )}
                  <button onClick={() => startEdit(addr)} className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}

            {creating ? (
              <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-foreground mb-2">{editingId ? 'Edit Address' : 'New Address'}</h3>
                <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} maxLength={20}
                  placeholder="Label (Home, Work...)" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100}
                  placeholder="Full Name *" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={20}
                  placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} maxLength={200}
                  placeholder="Street Address *" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} maxLength={80}
                    placeholder="City *" className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                  <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={80}
                    placeholder="State" className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                  <input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} maxLength={20}
                    placeholder="PIN" className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
                <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} maxLength={80}
                  placeholder="Country" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <label className="flex items-center gap-2 px-1 py-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-foreground">Set as default</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={cancelEdit} className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-1">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={startCreate} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add New Address
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddressesPage;
