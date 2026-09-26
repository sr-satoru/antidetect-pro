import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Globe,
  Cookie,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Upload,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Laptop,
} from 'lucide-react';
import { api } from '@/services/index.api';

interface ModalGerenciadorPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onToggleRunning?: (id: string | number) => void;
}

export const ModalGerenciadorPerfil: React.FC<ModalGerenciadorPerfilProps> = ({
  isOpen,
  onClose,
  profile,
  onToggleRunning,
}) => {
  const [activeTab, setActiveTab] = useState<'tabs' | 'cookies'>('tabs');

  // Estado das Abas Abertas
  const [tabs, setTabs] = useState<Array<{ id: string; url: string; title: string; is_active: boolean }>>([]);
  const [debugPort, setDebugPort] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [newTabUrl, setNewTabUrl] = useState('');
  const [isOpeningTab, setIsOpeningTab] = useState(false);

  // Estado dos Cookies
  const [cookieStats, setCookieStats] = useState<{
    total_count: number;
    domains: Array<{ domain: string; count: number }>;
    cookies: any[];
  } | null>(null);
  const [isLoadingCookies, setIsLoadingCookies] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carrega abas abertas
  const fetchTabs = useCallback(async () => {
    if (!profile) return;
    try {
      setIsLoadingTabs(true);
      const res = await api.profiles.getTabs(profile.id);
      setIsRunning(res.is_running);
      setDebugPort(res.port);
      setTabs(res.tabs || []);
    } catch (err: any) {
      console.error('Erro ao buscar abas:', err);
    } finally {
      setIsLoadingTabs(false);
    }
  }, [profile]);

  // Carrega cookies
  const fetchCookies = useCallback(async () => {
    if (!profile) return;
    try {
      setIsLoadingCookies(true);
      const res = await api.profiles.getCookies(profile.id);
      setCookieStats(res);
    } catch (err: any) {
      console.error('Erro ao buscar cookies:', err);
    } finally {
      setIsLoadingCookies(false);
    }
  }, [profile]);

  useEffect(() => {
    if (isOpen && profile) {
      fetchTabs();
      fetchCookies();
    }
  }, [isOpen, profile, fetchTabs, fetchCookies]);

  // Abrir nova aba
  const handleOpenTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabUrl.trim() || !profile) return;

    try {
      setIsOpeningTab(true);
      await api.profiles.openTab(profile.id, newTabUrl.trim());
      setNewTabUrl('');
      await fetchTabs();
    } catch (err: any) {
      alert(`Falha ao abrir aba: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsOpeningTab(false);
    }
  };

  // Fechar aba
  const handleCloseTab = async (tabId: string) => {
    if (!profile) return;
    try {
      await api.profiles.closeTab(profile.id, tabId);
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
    } catch (err: any) {
      alert(`Erro ao fechar aba: ${err.message}`);
    }
  };

  // Importar cookies
  const handleImportCookies = async () => {
    if (!cookieInput.trim() || !profile) return;
    try {
      setIsImporting(true);
      setImportMessage(null);
      const res = await api.profiles.importCookies(profile.id, cookieInput.trim());
      setImportMessage({
        type: 'success',
        text: `${res.imported} cookies importados com sucesso! (${res.skipped} ignorados)`,
      });
      setCookieInput('');
      await fetchCookies();
    } catch (err: any) {
      setImportMessage({
        type: 'error',
        text: err.message || 'Falha ao importar cookies.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Limpar cookies
  const handleClearCookies = async () => {
    if (!profile) return;
    if (!confirm('Deseja realmente limpar todos os cookies deste perfil?')) return;
    try {
      await api.profiles.clearCookies(profile.id);
      setCookieStats({ total_count: 0, domains: [], cookies: [] });
      setImportMessage({
        type: 'success',
        text: 'Todos os cookies foram removidos com sucesso.',
      });
    } catch (err: any) {
      alert(`Erro ao limpar cookies: ${err.message}`);
    }
  };

  // Exportar cookies em arquivo JSON
  const handleExportCookies = () => {
    if (!cookieStats || cookieStats.cookies.length === 0) {
      alert('Nenhum cookie para exportar.');
      return;
    }
    const jsonStr = JSON.stringify(cookieStats.cookies, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies_${profile?.name || 'perfil'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-[620px] max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-[#3E404D] bg-[#1E1F25] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3E404D] bg-[#24252B] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#44444C] bg-[#2D2E36] text-[#DFE104]">
              <Laptop size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{profile.name}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    isRunning
                      ? 'border border-[#22c55e]/30 bg-[#22c55e]/15 text-[#4ade80]'
                      : 'border border-[#71717a]/30 bg-[#71717a]/15 text-[#a1a1aa]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRunning ? 'bg-[#22c55e] animate-pulse' : 'bg-[#71717a]'
                    }`}
                  />
                  {isRunning ? 'Em Execução' : 'Parado'}
                </span>
                {debugPort && isRunning && (
                  <span className="rounded bg-[#383A44] px-1.5 py-0.5 text-[10px] font-mono text-[#D2D5DF]">
                    Porta: {debugPort}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9EA2AE]">
                Inspeção de URLs, Abas em tempo real e Gestão de Cookies SQLite
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#9EA2AE] hover:bg-[#383A44] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#3E404D] bg-[#1E1F25] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('tabs')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'tabs'
                ? 'border-[#DFE104] text-[#DFE104]'
                : 'border-transparent text-[#9EA2AE] hover:text-white'
            }`}
          >
            <Globe size={15} />
            <span>Abas e URLs Abertas</span>
            {isRunning && (
              <span className="rounded-full bg-[#DFE104]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#DFE104]">
                {tabs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === 'cookies'
                ? 'border-[#DFE104] text-[#DFE104]'
                : 'border-transparent text-[#9EA2AE] hover:text-white'
            }`}
          >
            <Cookie size={15} />
            <span>Gerenciador de Cookies</span>
            {cookieStats && (
              <span className="rounded-full bg-[#383A44] px-1.5 py-0.2 text-[10px] font-bold text-[#C8CBD4]">
                {cookieStats.total_count}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#44444C_#141418]">
          {activeTab === 'tabs' ? (
            <div className="flex flex-col gap-4">
              {isRunning ? (
                <>
                  {/* Formulário para abrir nova URL */}
                  <form onSubmit={handleOpenTab} className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EA2AE]"
                      />
                      <input
                        type="text"
                        value={newTabUrl}
                        onChange={(e) => setNewTabUrl(e.target.value)}
                        placeholder="https://exemplo.com ou digite a URL para abrir nova aba..."
                        className="h-10 w-full rounded-xl border border-[#3E404D] bg-[#24252B] pl-10 pr-3 text-xs text-white placeholder-[#71717a] outline-none transition-colors focus:border-[#DFE104]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isOpeningTab || !newTabUrl.trim()}
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#DFE104] px-4 text-xs font-bold text-black transition-all hover:bg-[#c9cb04] disabled:opacity-50"
                    >
                      {isOpeningTab ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      <span>Abrir Aba</span>
                    </button>
                    <button
                      type="button"
                      onClick={fetchTabs}
                      disabled={isLoadingTabs}
                      className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#3E404D] bg-[#24252B] px-3 text-[#9EA2AE] hover:text-white transition-colors"
                      title="Atualizar lista de abas"
                    >
                      <RefreshCw
                        size={14}
                        className={isLoadingTabs ? 'animate-spin' : ''}
                      />
                    </button>
                  </form>

                  {/* Lista de abas abertas */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#9EA2AE] uppercase tracking-wider">
                      <span>Abas em Execução ({tabs.length})</span>
                      <span>Sessão Automática Ativa</span>
                    </div>

                    {tabs.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {tabs.map((tab, idx) => (
                          <div
                            key={tab.id || idx}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#3E404D] bg-[#24252B] p-3 transition-colors hover:border-[#5E6172]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2D2E36] text-[#DFE104]">
                                <Globe size={16} />
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-xs font-bold text-white">
                                  {tab.title || tab.url}
                                </span>
                                <span className="truncate font-mono text-[11px] text-[#9EA2AE]">
                                  {tab.url}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <a
                                href={tab.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9EA2AE] hover:bg-[#383A44] hover:text-white transition-colors"
                                title="Abrir link externamente"
                              >
                                <ExternalLink size={14} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCloseTab(tab.id)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors"
                                title="Fechar esta aba"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#3E404D] p-8 text-center text-xs text-[#9EA2AE]">
                        Nenhuma aba identificada ou o navegador acabou de inicializar.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#3E404D] bg-[#24252B]/40 p-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2D2E36] text-[#9EA2AE]">
                    <Globe size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      O perfil não está em execução
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-[#9EA2AE]">
                      Inicie este perfil para monitorar as URLs abertas em tempo real, abrir novas abas ou inspecionar a navegação.
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#DFE104]/20 bg-[#DFE104]/10 px-3 py-1.5 text-xs font-medium text-[#DFE104]">
                    <CheckCircle2 size={14} />
                    <span>Restauração de Sessão automática ativada para o próximo início</span>
                  </div>
                  {onToggleRunning && (
                    <button
                      type="button"
                      onClick={() => onToggleRunning(profile.id)}
                      className="mt-3 cursor-pointer rounded-xl bg-[#DFE104] px-5 py-2 text-xs font-bold text-black hover:bg-[#c9cb04] transition-all"
                    >
                      Iniciar Perfil Agora
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Visão Geral dos Cookies */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#3E404D] bg-[#24252B] p-4">
                  <span className="text-[11px] font-semibold text-[#9EA2AE] uppercase">
                    Total de Cookies
                  </span>
                  <div className="mt-1 text-2xl font-bold text-[#DFE104]">
                    {cookieStats?.total_count || 0}
                  </div>
                </div>

                <div className="rounded-xl border border-[#3E404D] bg-[#24252B] p-4">
                  <span className="text-[11px] font-semibold text-[#9EA2AE] uppercase">
                    Domínios Gravados
                  </span>
                  <div className="mt-1 text-2xl font-bold text-white">
                    {cookieStats?.domains?.length || 0}
                  </div>
                </div>

                <div className="rounded-xl border border-[#3E404D] bg-[#24252B] p-4">
                  <span className="text-[11px] font-semibold text-[#9EA2AE] uppercase">
                    Banco de Dados
                  </span>
                  <div className="mt-1 text-xs font-mono text-[#D2D5DF]">
                    moz_cookies (SQLite)
                  </div>
                </div>
              </div>

              {/* Ações de Importar e Exportar */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#3E404D] bg-[#24252B] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Importar Cookies (JSON / Netscape txt)
                    </h4>
                    <p className="text-[11px] text-[#9EA2AE]">
                      Cole cookies exportados do EditThisCookie, Puppeteer, Cookie-Editor ou Netscape.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCookies}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3E404D] bg-[#1E1F25] px-3 py-1.5 text-xs font-medium text-[#C8CBD4] hover:text-white transition-colors"
                    >
                      <Download size={13} />
                      <span>Exportar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCookies}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-1.5 text-xs font-medium text-[#ef4444] hover:bg-[#ef4444] hover:text-black transition-all"
                    >
                      <Trash2 size={13} />
                      <span>Limpar</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder='Cole aqui o JSON de cookies (ex: [{"name": "session", "value": "xyz", "domain": ".site.com"}]) ou Netscape txt...'
                  className="w-full rounded-xl border border-[#3E404D] bg-[#1E1F25] p-3 font-mono text-[11px] text-white placeholder-[#71717a] outline-none transition-colors focus:border-[#DFE104]"
                />

                {importMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                      importMessage.type === 'success'
                        ? 'border border-[#22c55e]/30 bg-[#22c55e]/15 text-[#4ade80]'
                        : 'border border-[#ef4444]/30 bg-[#ef4444]/15 text-[#f87171]'
                    }`}
                  >
                    {importMessage.type === 'success' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    <span>{importMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportCookies}
                    disabled={isImporting || !cookieInput.trim()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#DFE104] px-4 py-2 text-xs font-bold text-black hover:bg-[#c9cb04] transition-all disabled:opacity-50"
                  >
                    {isImporting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>Gravar no SQLite do Perfil</span>
                  </button>
                </div>
              </div>

              {/* Lista de domínios com cookies */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-[#9EA2AE] uppercase tracking-wider">
                  Domínios Registrados
                </span>

                {cookieStats && cookieStats.domains.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto [scrollbar-width:thin]">
                    {cookieStats.domains.map((d) => (
                      <div
                        key={d.domain}
                        className="flex items-center justify-between rounded-lg border border-[#3E404D] bg-[#24252B] px-3 py-2 text-xs"
                      >
                        <span className="truncate font-mono text-[#D2D5DF]">
                          {d.domain}
                        </span>
                        <span className="rounded bg-[#383A44] px-1.5 py-0.5 text-[10px] font-bold text-[#DFE104]">
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#3E404D] p-6 text-center text-xs text-[#9EA2AE]">
                    Nenhum cookie registrado ainda para este perfil.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
