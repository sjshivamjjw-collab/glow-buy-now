import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Calendar, Phone, FileBox, Lock } from 'lucide-react';

const CommunityRoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/c/${slug}`)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Community</h1>
      </div>

      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">You're in!</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Chat, events, calls and member-only channels are launching in Phase 2. Hang tight.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {[
          { icon: MessageSquare, label: 'Chat' },
          { icon: Calendar, label: 'Events' },
          { icon: Phone, label: '1-1 calls' },
          { icon: FileBox, label: 'Resources' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="p-4 rounded-2xl bg-card border border-border opacity-60 flex flex-col items-center gap-2">
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityRoomPage;
