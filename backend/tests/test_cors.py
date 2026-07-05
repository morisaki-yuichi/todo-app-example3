from fastapi.testclient import TestClient

from app.config import settings

ALLOWED_ORIGIN = settings.frontend_origin


def test_preflight_from_allowed_origin(client: TestClient) -> None:
    """ブラウザが本リクエストの前に送る「お伺い」（プリフライト）が許可される。

    Authorization ヘッダーつきの別オリジンリクエストは「単純リクエスト」では
    ないため、ブラウザはまず OPTIONS で送ってよいか確認する。
    """
    response = client.options(
        "/todos",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "GET" in response.headers["access-control-allow-methods"]


def test_actual_response_carries_allow_origin(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_unknown_origin_gets_no_allow_header(client: TestClient) -> None:
    """許可外オリジンには Access-Control-Allow-Origin を返さない。

    サーバは応答自体を拒否しない（200）が、許可ヘッダーがないため
    ブラウザ側が JS への受け渡しをブロックする。
    """
    response = client.get(
        "/health", headers={"Origin": "https://evil.example.com"}
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers