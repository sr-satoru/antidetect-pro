use star_multlogin_backend::server_sync::cloud_auth::client::{ExchangeResponse, RefreshResponse};

#[test]
fn test_deserialize_exchange_response_from_java() {
    let json_from_java = r#"{
        "access_token": "mock_access_jwt",
        "refresh_token": "mock_refresh_jwt",
        "token_type": "Bearer",
        "expires_in": 300,
        "user": {
            "id": "user-uuid-123",
            "email": "user@test.com",
            "name": "User Test",
            "plan": "free",
            "max_profiles": 10,
            "profile_count": 2
        }
    }"#;

    let parsed: Result<ExchangeResponse, _> = serde_json::from_str(json_from_java);
    assert!(parsed.is_ok(), "Falha ao desserializar JSON do Java: {:?}", parsed.err());
    let res = parsed.unwrap();
    assert_eq!(res.access_token, "mock_access_jwt");
    assert_eq!(res.refresh_token, "mock_refresh_jwt");
    assert_eq!(res.expires_in, 300);
    assert_eq!(res.user.email, "user@test.com");
    assert_eq!(res.user.max_profiles, 10);
    assert_eq!(res.user.profile_count, 2);
}

#[test]
fn test_deserialize_refresh_response_from_java() {
    let json_from_java = r#"{
        "access_token": "new_access_jwt",
        "token_type": "Bearer",
        "expires_in": 300
    }"#;

    let parsed: Result<RefreshResponse, _> = serde_json::from_str(json_from_java);
    assert!(parsed.is_ok(), "Falha ao desserializar refresh JSON: {:?}", parsed.err());
    let res = parsed.unwrap();
    assert_eq!(res.access_token, "new_access_jwt");
    assert_eq!(res.expires_in, 300);
}
