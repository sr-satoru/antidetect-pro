/// Utilitário para particionamento de variáveis de ambiente do Camoufox.
///
/// No Windows, a função `getenv()` do autoconfig lê o ambiente através da página
/// de código ANSI, corrompendo strings maiores que 2.047 bytes ou caracteres UTF-8 não-ASCII.
/// No Linux e macOS, o limite do ambiente de processo é muito maior (32.767 bytes).
/// O motor C++ do Camoufox (MaskConfig.hpp) e o autoconfig (camoufox.cfg) são programados
/// para reconstruir em memória variáveis prefixadas indexadas: `CAMOU_CONFIG_1..N` e `CAMOU_PREFS_1..N`.

/// Particiona uma string em blocos menores com tamanho máximo especificado.
/// Garante que o particionamento nunca corte caracteres multibyte no meio.
pub fn chunk_environment_variable(prefix: &str, data: &str, chunk_size: usize) -> Vec<(String, String)> {
    let mut chunks = Vec::new();
    if data.is_empty() {
        return chunks;
    }

    let mut i = 0;
    let mut index = 1;
    let bytes = data.as_bytes();

    while i < bytes.len() {
        let end = std::cmp::min(i + chunk_size, bytes.len());
        // Garante corte em fronteira válida de caractere UTF-8
        let mut slice_end = end;
        while slice_end > i && !data.is_char_boundary(slice_end) {
            slice_end -= 1;
        }
        if slice_end == i {
            slice_end = end;
        }

        let chunk = &data[i..slice_end];
        chunks.push((format!("{prefix}_{index}"), chunk.to_string()));
        index += 1;
        i = slice_end;
    }

    chunks
}

/// Converte um valor JSON em string com caracteres não-ASCII escapados no formato `\uXXXX`.
/// Essencial para Windows onde o `getenv()` destrói bytes UTF-8 literais.
pub fn to_ascii_escaped_json(val: &serde_json::Value) -> String {
    let raw = serde_json::to_string(val).unwrap_or_else(|_| "{}".to_string());
    let mut out = String::with_capacity(raw.len() + 32);
    for c in raw.chars() {
        if c.is_ascii() {
            out.push(c);
        } else {
            for b in c.encode_utf16(&mut [0; 2]) {
                use std::fmt::Write;
                let _ = write!(out, "\\u{:04x}", b);
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunking_small_string() {
        let data = "hello world";
        let chunks = chunk_environment_variable("CAMOU_CONFIG", data, 50);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].0, "CAMOU_CONFIG_1");
        assert_eq!(chunks[0].1, "hello world");
    }

    #[test]
    fn test_chunking_large_string() {
        let data = "a".repeat(5000);
        let chunks = chunk_environment_variable("CAMOU_CONFIG", &data, 2047);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].0, "CAMOU_CONFIG_1");
        assert_eq!(chunks[0].1.len(), 2047);
        assert_eq!(chunks[1].0, "CAMOU_CONFIG_2");
        assert_eq!(chunks[1].1.len(), 2047);
        assert_eq!(chunks[2].0, "CAMOU_CONFIG_3");
        assert_eq!(chunks[2].1.len(), 5000 - 4094);
    }

    #[test]
    fn test_ascii_escape() {
        let val = serde_json::json!({ "cidade": "São Paulo" });
        let escaped = to_ascii_escaped_json(&val);
        assert!(!escaped.contains("São"));
        assert!(escaped.contains("\\u00e3")); // ã
    }
}
