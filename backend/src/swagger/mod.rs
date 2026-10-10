pub mod openapi;

pub use openapi::ApiDoc;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
use axum::Router;

/// Monta a documentação interativa Swagger UI e o schema OpenAPI 3.0 no servidor Axum
/// 
/// Endpoints disponíveis:
/// - Visualizador Swagger UI: http://127.0.0.1:3001/swagger-ui/
/// - Especificação OpenAPI JSON: http://127.0.0.1:3001/api-docs/openapi.json
pub fn mount_swagger_ui(router: Router) -> Router {
    router.merge(
        SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi())
    )
}
