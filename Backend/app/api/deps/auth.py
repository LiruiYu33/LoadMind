from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.integrations.supabase.client import supabase_client


class CurrentUser(BaseModel):
    id: str
    email: str | None = None


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be a Bearer token.",
        )
    return token


def get_current_user(access_token: str = Depends(get_bearer_token)) -> CurrentUser:
    try:
        payload = supabase_client.verify_access_token(access_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user_id = payload.get("id") or payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token did not contain a valid user id.",
        )

    email = payload.get("email")
    if email is not None and not isinstance(email, str):
        email = None

    return CurrentUser(id=user_id, email=email)
