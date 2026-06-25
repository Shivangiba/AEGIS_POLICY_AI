
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import base64

security = HTTPBearer()


def _get_signing_key(token: str):
    """
    Inspect the JWT header and return the correct signing key.
    - HS256  → use the legacy SUPABASE_JWT_SECRET (base64-decoded)
    - RS256 / ES256 → fetch the public key from Supabase JWKS endpoint
    """
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "HS256":
        secret = settings.SUPABASE_JWT_SECRET
        try:
            return base64.b64decode(secret)
        except Exception:
            return secret.encode("utf-8") if isinstance(secret, str) else secret

    elif alg in ("RS256", "ES256"):
        supabase_url = getattr(settings, "SUPABASE_URL", None)
        if not supabase_url:
            raise jwt.InvalidTokenError(
                "Token uses RS256/ES256 but SUPABASE_URL is missing from backend/.env."
            )
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)
        return jwks_client.get_signing_key_from_jwt(token)

    else:
        raise jwt.InvalidTokenError(
            f"Unsupported JWT algorithm: {alg}. Expected HS256, RS256, or ES256."
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        key = _get_signing_key(token)
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        payload = jwt.decode(
            token,
            key,
            algorithms=[alg],
            options={"verify_aud": False}
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials: No sub found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )