use std::collections::HashMap;
use serde_json::Value;
use crate::models::Profile;

/// Constrói o mapa de propriedades de CAMOU_CONFIG que será injetado nas variáveis de ambiente.
/// Esse mapa é processado diretamente pelo código C++ do Camoufox (MaskConfig.hpp).
pub fn build_camou_config_map(
    profile: &Profile,
    proxy_ip: Option<&str>,
    addon_paths: &[String],
) -> HashMap<String, Value> {
    crate::fingerprint::translator::build_camou_config(profile, proxy_ip, addon_paths)
}
