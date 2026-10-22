#!/usr/bin/env python3
# SPDX-License-Identifier: MIT OR Apache-2.0
"""
Módulo de Teste E2E e Disparo de Notificações Reais para o Modal NotificationsDropdown.

Este módulo NÃO interfere no código de produção do app:
- Conecta-se ao app em execução (http://localhost:1254/) via Playwright
- Dispara notificações reais via importação dinâmica do módulo ESM serviceNotifications
- Valida contadores, badges, abertura do modal, renderização de cards, alternância de abas,
  marcação como lida, exclusão e fechamento via ESC
- Gera screenshots de validação visual
"""

import sys
import time
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:1254"

SAMPLE_NOTIFICATIONS = [
    {
        "title": "Proxy SOCKS5 Conectado",
        "description": "Túnel residencial 185.220.101.5 ativo com latência de 38ms e DNS protegido contra vazamentos.",
        "type": "success",
        "meta": {"ip": "185.220.101.5", "latencia_ms": 38, "dns_leak": "safe"},
    },
    {
        "title": "IP de Saída Rotacionado",
        "description": "O provedor proxy rotacionou o IP de saída. Fuso horário mantido coerente com o novo nó.",
        "type": "warning",
        "meta": {"novo_ip": "45.132.88.21", "regiao": "US-East"},
    },
    {
        "title": "Binário AstroFox 150 Pronto",
        "description": "Novo motor de navegador Camoufox verificado e disponível para lançamento de perfis.",
        "type": "info",
        "meta": {"versao": "150.0.1", "hash": "sha256-e91b..."},
    },
    {
        "title": "Falha de Autenticação em Proxy",
        "description": "Credenciais do proxy 'Mobile 4G' recusadas pelo gateway upstream (407 Proxy Auth Required).",
        "type": "error",
        "meta": {"host": "proxy.provider.com:8080", "status_code": 407},
    },
    {
        "title": "Sincronização em Nuvem Concluída",
        "description": "14 perfis sincronizados com sucesso usando criptografia ponta-a-ponta (E2EE Vault).",
        "type": "migration",
        "meta": {"perfis_sincronizados": 14, "tamanho_kb": 2450},
    },
]

def run_tests(headed: bool = False, output_dir: str = "/tmp/notifications_test_results"):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("🚀 INICIANDO TESTE DO MODAL DE NOTIFICAÇÕES (Módulo Isolado)")
    print("=" * 65)
    print(f"Alvo: {APP_URL}")
    print(f"Diretório de Artefatos: {out_path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        try:
            print("\n1. Conectando à aplicação...")
            page.goto(APP_URL, wait_until="networkidle", timeout=15000)
            print("   ✅ Conectado com sucesso ao frontend Vite.")

            # Validação 1: Disparo de notificações via módulo ESM serviceNotifications
            print("\n2. Injetando 5 notificações reais de tipos distintos...")
            injected_count = page.evaluate("""async (samples) => {
                const mod = await import('/services/notifications/service.notifications.ts');
                // Limpa antes para garantir estado limpo
                mod.serviceNotifications.clearAll();
                
                for (const item of samples) {
                    mod.serviceNotifications.add(item);
                }
                return mod.serviceNotifications.getAll().length;
            }""", SAMPLE_NOTIFICATIONS)

            assert injected_count == 5, f"Esperava 5 notificações injetadas, obteve {injected_count}"
            print(f"   ✅ {injected_count} notificações injetadas com sucesso no singleton global.")

            # Validação 2: Verificar badge de não lidas no botão do Header
            time.sleep(0.5)
            badge_selector = 'button[title="Notificações"] span'
            badge_el = page.locator(badge_selector)
            assert badge_el.is_visible(), "Badge de notificações não lidas não está visível no Header!"
            badge_text = badge_el.inner_text().strip()
            print(f"   ✅ Badge no Header visível com valor: '{badge_text}' (Esperado: '5')")
            assert badge_text == "5", f"Badge inesperado: {badge_text}"

            # Validação 3: Abrir o modal clicando no sino
            print("\n3. Abrindo o Modal de Notificações...")
            bell_button = page.locator('button[title="Notificações"]')
            bell_button.click()
            time.sleep(0.5)

            # O modal deve estar renderizado
            modal_heading = page.locator('button:has-text("Notificações não lidas")')
            assert modal_heading.is_visible(), "Modal não abriu após clicar no botão do sino!"
            print("   ✅ Modal aberto com sucesso no DOM via React Portal.")

            # Captura screenshot do modal aberto
            screenshot_1 = out_path / "01_modal_notificacoes_aberto.png"
            page.screenshot(path=str(screenshot_1))
            print(f"   📸 Screenshot salvo: {screenshot_1}")

            # Validação 4: Verificar se os 5 cards foram renderizados com seus títulos
            print("\n4. Verificando renderização dos cards e tipos...")
            for sample in SAMPLE_NOTIFICATIONS:
                card_title = page.locator(f'h4:has-text("{sample["title"]}")')
                assert card_title.is_visible(), f"Card '{sample['title']}' não encontrado no modal!"
                print(f"   ✅ Card verificado: [{sample['type'].upper()}] {sample['title']}")

            # Validação 5: Alternância de abas
            print("\n5. Testando alternância entre abas...")
            tab_all = page.locator('button:has-text("Todas as notificações")')
            tab_all.click()
            time.sleep(0.3)
            screenshot_2 = out_path / "02_aba_todas_notificacoes.png"
            page.screenshot(path=str(screenshot_2))
            print(f"   ✅ Aba 'Todas as notificações' clicada. Screenshot: {screenshot_2}")

            tab_unread = page.locator('button:has-text("Notificações não lidas")')
            tab_unread.click()
            time.sleep(0.3)
            print("   ✅ Retornado para aba 'Notificações não lidas'.")

            # Validação 6: Marcar um item individual como lido
            print("\n6. Testando marcar notificação individual como lida...")
            first_mark_read_btn = page.locator('button:has-text("Marcar como lida")').first
            first_mark_read_btn.click()
            time.sleep(0.4)

            # Agora na aba "não lidas" devem sobrar 4 cards
            cards_count = page.locator('h4').count()
            print(f"   ✅ Notificação marcada como lida. Cards restantes na aba 'Não Lidas': {cards_count} (Esperado: 4)")
            assert cards_count == 4, f"Esperava 4 cards restantes após marcar 1 como lida, obteve {cards_count}"

            # Validação 7: Botão "Marcar lidas" no topo
            print("\n7. Testando botão 'Marcar lidas' em lote...")
            mark_all_btn = page.locator('button[title="Marcar todas como lidas"]')
            assert mark_all_btn.is_visible(), "Botão 'Marcar todas como lidas' não está visível!"
            mark_all_btn.click()
            time.sleep(0.4)

            # Aba de não lidas agora deve exibir empty state: "Sem novas notificações"
            empty_state = page.locator('text="Sem novas notificações"')
            assert empty_state.is_visible(), "Empty state 'Sem novas notificações' não apareceu!"
            print("   ✅ Empty state exibido com sucesso: 'Sem novas notificações'")

            screenshot_3 = out_path / "03_empty_state_lidas.png"
            page.screenshot(path=str(screenshot_3))
            print(f"   📸 Screenshot salvo: {screenshot_3}")

            # Validação 8: Na aba "Todas as notificações", todas as 5 continuam lá
            tab_all.click()
            time.sleep(0.3)
            all_cards_count = page.locator('h4').count()
            print(f"   ✅ Aba 'Todas as notificações' exibe {all_cards_count} itens.")
            assert all_cards_count == 5, f"Esperava 5 notificações no histórico total, obteve {all_cards_count}"

            # Validação 9: Exclusão individual
            print("\n8. Testando exclusão individual de notificação...")
            delete_btn = page.locator('button[title="Excluir notificação"]').first
            delete_btn.click()
            time.sleep(0.3)
            after_delete_count = page.locator('h4').count()
            print(f"   ✅ Notificação excluída. Restantes: {after_delete_count} (Esperado: 4)")
            assert after_delete_count == 4, f"Esperava 4 notificações após excluir 1, obteve {after_delete_count}"

            # Validação 10: Limpar tudo
            print("\n9. Testando botão 'Limpar todas as notificações'...")
            clear_all_btn = page.locator('button[title="Limpar todas as notificações"]')
            clear_all_btn.click()
            time.sleep(0.3)
            empty_all = page.locator('text="Sem novas notificações"')
            assert empty_all.is_visible(), "Empty state não apareceu após limpar tudo!"
            print("   ✅ Todas as notificações limpas com sucesso!")

            # Validação 11: Fechar modal com tecla ESC
            print("\n10. Testando fechamento com tecla ESC...")
            page.keyboard.press("Escape")
            time.sleep(0.3)
            assert not modal_heading.is_visible(), "Modal não fechou com a tecla ESC!"
            print("   ✅ Modal fechado com sucesso via ESC.")

            # Reinjetar notificações finais para deixar o ambiente populado para o usuário ver
            print("\n11. Re-injetando notificações no app para que o usuário possa ver e interagir...")
            page.evaluate("""async (samples) => {
                const mod = await import('/services/notifications/service.notifications.ts');
                for (const item of samples) {
                    mod.serviceNotifications.add(item);
                }
            }""", SAMPLE_NOTIFICATIONS)
            print("   ✅ 5 notificações prontas e ativas na sessão!")

            print("\n" + "=" * 65)
            print("🎉 TODOS OS 11 TESTES DO MODAL FORAM CONCLUÍDOS COM 100% DE SUCESSO!")
            print("=" * 65)

        except Exception as e:
            err_shot = out_path / "error_state.png"
            page.screenshot(path=str(err_shot))
            print(f"\n❌ ERRO NO TESTE: {e}")
            print(f"📸 Screenshot do erro salvo em: {err_shot}")
            browser.close()
            sys.exit(1)

        browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste E2E do Modal de Notificações")
    parser.add_argument("--headed", action="store_true", help="Executa o browser com interface gráfica visível")
    parser.add_argument("--out", default="/tmp/notifications_test_results", help="Diretório de screenshots de saída")
    args = parser.parse_args()

    run_tests(headed=args.headed, output_dir=args.out)
