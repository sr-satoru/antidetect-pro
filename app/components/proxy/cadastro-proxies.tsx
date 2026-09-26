import React, { useState } from 'react';
import {
  X,
  Plus,
  FileText,
  Sliders,
  Globe,
  ArrowLeft,
  Link,
} from 'lucide-react';
import {
  FormularioCamposProxy,
  ProxyFormValues,
} from './formulario-campos-proxy';
import { toast } from 'sonner';

interface CadastroProxiesProps {
  onClose: () => void;
  onSave: (data: any | any[]) => void;
}

const INITIAL_FORM_VALUES: ProxyFormValues = {
  name: '',
  type: 'socks5',
  host: '',
  port: '',
  user: '',
  pass: '',
  rotationLink: '',
};

export const CadastroProxies: React.FC<CadastroProxiesProps> = ({
  onClose,
  onSave,
}) => {
  const [tab, setTab] = useState<'individual' | 'batch'>('individual');
  const [formValues, setFormValues] =
    useState<ProxyFormValues>(INITIAL_FORM_VALUES);
  const [batchText, setBatchText] = useState('');

  const handleFieldChange = (field: keyof ProxyFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveIndividual = () => {
    if (!formValues.host.trim() || !formValues.port.trim()) {
      toast.warning('Por favor, informe ao menos o Host e a Porta.');
      return false;
    }

    const payload = {
      name:
        formValues.name.trim() ||
        `Proxy ${formValues.host}:${formValues.port}`,
      type: formValues.type,
      host: formValues.host.trim(),
      port: formValues.port.trim(),
      user: formValues.user.trim(),
      pass: formValues.pass.trim(),
      rotationLink: formValues.rotationLink.trim(),
      ip: formValues.host.trim(),
      country: 'BR - Brasil',
      status: 'active',
      ping: 45,
      lastChecked: new Date()
        .toISOString()
        .substring(5, 19)
        .replace('T', ' '),
      usageCount: 0,
      createdAt: new Date().toISOString().substring(5, 19).replace('T', ' '),
    };

    onSave(payload);
    return true;
  };

  const handleSaveBatch = () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.warning('Cole ao menos um proxy na caixa de texto.');
      return false;
    }

    const parsedList = lines.map((line, idx) => {
      let pType = 'socks5';
      let clean = line;

      if (clean.includes('://')) {
        const parts = clean.split('://');
        pType = parts[0].toLowerCase();
        clean = parts[1];
      }

      let pUser = '';
      let pPass = '';
      let pHost = '';
      let pPort = '';

      if (clean.includes('@')) {
        const atParts = clean.split('@');
        const creds = atParts[0].split(':');
        pUser = creds[0] || '';
        pPass = creds[1] || '';
        const server = atParts[1].split(':');
        pHost = server[0] || '';
        pPort = server[1] || '';
      } else {
        const parts = clean.split(':');
        pHost = parts[0] || '';
        pPort = parts[1] || '';
        pUser = parts[2] || '';
        pPass = parts[3] || '';
      }

      return {
        name: `Proxy Importado #${idx + 1}`,
        type: ['socks5', 'http', 'https', 'mobile'].includes(pType)
          ? pType
          : 'socks5',
        host: pHost,
        port: pPort,
        user: pUser,
        pass: pPass,
        ip: pHost,
        country: 'BR - Brasil',
        status: 'active',
        ping: 45,
        lastChecked: new Date()
          .toISOString()
          .substring(5, 19)
          .replace('T', ' '),
        usageCount: 0,
        createdAt: new Date().toISOString().substring(5, 19).replace('T', ' '),
      };
    });

    onSave(parsedList);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success =
      tab === 'individual' ? handleSaveIndividual() : handleSaveBatch();
    if (success) {
      onClose();
    }
  };

  const batchLines = batchText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const connectionUri = formValues.host
    ? `${formValues.type}://${
        formValues.user
          ? `${formValues.user}:${formValues.pass ? '••••••' : ''}@`
          : ''
      }${formValues.host}${formValues.port ? `:${formValues.port}` : ''}`
    : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#24252B] text-[#D2D5DF]">
      {/* 1. Header do Painel */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#3E404D] bg-[#1E1F26] px-6 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg p-1.5 text-xs text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Voltar para a lista"
          >
            <ArrowLeft size={16} />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="h-4 w-[1px] bg-[#3E404D]" />

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#DFE104]/30 bg-[#DFE104]/10 text-[#DFE104]">
              <Globe size={13} />
            </div>
            <span className="text-sm font-semibold text-white">
              Cadastrar Novo Proxy
            </span>
          </div>
        </div>

        {/* Abas: Individual vs Lote */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#333541] bg-[#14151B] p-1">
            <button
              type="button"
              onClick={() => setTab('individual')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === 'individual'
                  ? 'bg-[#383944] text-white shadow-xs'
                  : 'text-[#8E92A2] hover:text-white'
              }`}
            >
              <Sliders size={13} />
              <span>Cadastro Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('batch')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === 'batch'
                  ? 'bg-[#383944] text-white shadow-xs'
                  : 'text-[#8E92A2] hover:text-white'
              }`}
            >
              <FileText size={13} />
              <span>Importação em Lote</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Fechar formulário"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 2. Conteúdo do Painel - Área com Scroll */}
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-6xl p-6">
          {tab === 'individual' ? (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Formulário Principal */}
              <div className="lg:col-span-7">
                <FormularioCamposProxy
                  values={formValues}
                  onChange={handleFieldChange}
                />
              </div>

              {/* Coluna Lateral: Resumo & Dicas */}
              <div className="space-y-4 lg:col-span-5">
                {/* Resumo da Conexão */}
                <div className="space-y-3 rounded-xl border border-[#363847] bg-[#191A22] p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white uppercase select-none">
                    <Link size={14} className="text-[#DFE104]" />
                    <span>Resumo da Conexão</span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#8E92A2]">
                    Prévia do formato gerado para o proxy configurado:
                  </p>

                  <div className="rounded-lg border border-[#2E303D] bg-[#13141A] p-3">
                    <span className="block font-mono text-xs break-all text-[#DFE104]">
                      {connectionUri || 'Preencha o host e a porta'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11.5px] text-[#8E92A2]">
                    <div className="flex justify-between">
                      <span>Protocolo:</span>
                      <strong className="text-white uppercase">
                        {formValues.type}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Autenticação:</span>
                      <strong className="text-white">
                        {formValues.user ? 'Configurada' : 'Nenhuma'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rotação de IP:</span>
                      <strong className="text-white">
                        {formValues.rotationLink ? 'Ativada' : 'Desativada'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Modo Importação em Lote */
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-8">
                <div className="flex items-center justify-between">
                  <label className="block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                    Lista de Proxies (um por linha)
                  </label>
                  <span className="text-xs text-[#8E92A2]">
                    {batchLines.length} linha
                    {batchLines.length === 1 ? '' : 's'} detectada
                    {batchLines.length === 1 ? '' : 's'}
                  </span>
                </div>

                <textarea
                  rows={12}
                  placeholder={`79.127.168.43:50101:usuario:senha\n151.245.245.179:50101\nsocks5://user:pass@177.18.29.102:1080\nhttp://45.162.228.91:3128`}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full rounded-xl border border-[#363847] bg-[#181920] p-4 font-mono text-[12.5px] leading-relaxed text-white placeholder-[#5C6070] focus:border-[#2F80ED] focus:outline-hidden"
                />
              </div>

              <div className="space-y-4 lg:col-span-4">
                <div className="space-y-3 rounded-xl border border-[#363847] bg-[#191A22] p-4 text-xs">
                  <span className="block text-[11px] font-semibold tracking-wider text-white uppercase">
                    Formatos Reconhecidos
                  </span>
                  <div className="space-y-2 font-mono text-[11px] text-[#C4C7D5]">
                    <div className="rounded border border-[#2B2D38] bg-[#14151B] p-2">
                      <span className="block font-sans text-[10px] text-[#8E92A2]">
                        Padrão Simples:
                      </span>
                      <span className="text-[#DFE104]">host:porta</span>
                    </div>
                    <div className="rounded border border-[#2B2D38] bg-[#14151B] p-2">
                      <span className="block font-sans text-[10px] text-[#8E92A2]">
                        Com Autenticação:
                      </span>
                      <span className="text-[#DFE104]">
                        host:porta:usuario:senha
                      </span>
                    </div>
                    <div className="rounded border border-[#2B2D38] bg-[#14151B] p-2">
                      <span className="block font-sans text-[10px] text-[#8E92A2]">
                        Formato URI:
                      </span>
                      <span className="text-[#DFE104]">
                        tipo://usuario:senha@host:porta
                      </span>
                    </div>
                  </div>
                </div>

                {batchLines.length > 0 && (
                  <div className="space-y-1 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 p-4 text-xs text-[#10b981]">
                    <span className="block font-bold">
                      Pronto para importar!
                    </span>
                    <p className="text-[11.5px] text-[#A6ABB9]">
                      Ao clicar em Salvar, <strong>{batchLines.length}</strong>{' '}
                      novos proxies serão adicionados à sua tabela.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer com Botões de Ação */}
        <div className="flex h-16 shrink-0 items-center justify-start gap-3 border-t border-[#3E404D] bg-[#1E1F26] px-6 select-none">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#DFE104] px-5 py-2.5 text-xs font-bold text-black shadow-[0_2px_10px_rgba(223,225,4,0.15)] transition-all hover:bg-[#C5C702] active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>
              {tab === 'batch'
                ? `Importar ${batchLines.length > 0 ? `${batchLines.length} ` : ''}Proxies`
                : 'Salvar Proxy'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CadastroProxies;
