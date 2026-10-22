import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileDown } from 'lucide-react';

const SAMPLE_EXAMPLE_TXT = `acc_id=476436
id=k1d0cd11
group=Minhas_Contas
name=perfil_exemplo_01
password=senha_segura
fakey=ABCD1234
cookie=[{"name":"auth_token","value":"xyz123","domain":".x.com","path":"/","secure":true,"sameSite":"None"}]
proxytype=socks5
proxy=127.0.0.1:1080:usuario:senha
ua=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
resolution=1920*1080
******************
acc_id=476437
id=k1d0cd12
group=Minhas_Contas
name=perfil_exemplo_02
password=senha_segura_2
cookie=[]
proxytype=http
proxy=127.0.0.1:8080
resolution=1680*1050
******************`;

export const ImportHeader: React.FC = () => {
  const navigate = useNavigate();

  const handleDownloadExample = () => {
    const blob = new Blob([SAMPLE_EXAMPLE_TXT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exemplo_adspower_export.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-6 py-4 select-none">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate('/perfis')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] text-slate-500 hover:text-slate-900 dark:text-[#9DA2B4] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#282A33] transition-colors cursor-pointer shadow-2xs active:scale-95"
          title="Voltar para a lista de perfis"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <FileDown size={18} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Importar Perfis em Lote
            </h1>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#9DA2B4]">
            Suporte nativo para exportações do AdsPower (.txt delimitado por asteriscos), CSV e JSON.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleDownloadExample}
          className="h-8 px-3 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] hover:bg-slate-50 dark:hover:bg-[#282A33] text-slate-600 dark:text-[#E2E4EC] hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title="Baixar arquivo TXT de exemplo no formato do AdsPower"
        >
          <Download size={13} />
          <span>Baixar Exemplo AdsPower (.txt)</span>
        </button>
      </div>
    </div>
  );
};
