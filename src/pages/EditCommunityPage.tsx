import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Stub for editing — Phase 2 will flesh this out. For now redirect to community page.
const EditCommunityPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Edit community</h1>
      </div>
      <p className="text-sm text-muted-foreground">Editing UI is coming in Phase 2. For now, archive and re-publish.</p>
    </div>
  );
};

export default EditCommunityPage;
