import React, { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff, ShieldCheck, Globe } from 'lucide-react';
import { toast } from '@/components/ui/notification';

interface CompactCredentialsProps {
  apiPort?: number;
  token?: string;
}

export const CompactCredentials: React.FC<CompactCredentialsProps> = ({
  apiPort = 18922,
  token = 'star_sec_8f92a10b48c34791a82f091c7823e4590d1e345f8a213904',
}) => {
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    toast.success('URL base copiada!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success('Token copiado!');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Base URL Pill */}
      <div className="flex items-center gap-2 bg-[#383838]/80 hover:bg-[#383838] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs">
        <Globe size={13} className="text-[#DFE104] shrink-0" />
        <span className="text-[#D4D4D8] select-all">{baseUrl}</span>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="text-[#8E8E93] hover:text-[#DFE104] p-0.5 transition-colors"
          title="Copiar URL"
        >
          {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Secret Token Pill */}
      <div className="flex items-center gap-2 bg-[#383838]/80 hover:bg-[#383838] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs">
        <Key size={13} className="text-amber-400 shrink-0" />
        <span className="text-[#D4D4D8] select-all">
          {showToken ? token : `${token.substring(0, 14)}••••••••••`}
        </span>
        <div className="flex items-center gap-1 border-l border-white/[0.08] pl-1.5 ml-0.5">
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="text-[#8E8E93] hover:text-white p-0.5 transition-colors"
            title={showToken ? 'Ocultar' : 'Visualizar'}
          >
            {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            type="button"
            onClick={handleCopyToken}
            className="text-[#8E8E93] hover:text-[#DFE104] p-0.5 transition-colors"
            title="Copiar Token"
          >
            {copiedToken ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Security Tag */}
      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
        <ShieldCheck size={13} />
        <span>Loopback 0600</span>
      </div>
    </div>
  );
};

export default CompactCredentials;
