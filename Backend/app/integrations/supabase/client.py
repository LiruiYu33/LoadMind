from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class SupabaseClient:
    """Thin HTTP wrapper around Supabase Auth and PostgREST APIs."""

    def __init__(self) -> None:
        self.url = settings.supabase_url.rstrip("/")
        self.anon_key = settings.supabase_anon_key
        self.service_role_key = settings.supabase_service_role_key
        self.timeout_seconds = settings.supabase_timeout_seconds

    def is_configured(self) -> bool:
        return bool(self.url and self.service_role_key)

    def verify_access_token(self, access_token: str) -> dict[str, Any]:
        if not self.url:
            raise ValueError("Supabase URL is not configured.")

        apikey = self.anon_key or self.service_role_key
        if not apikey:
            raise ValueError("Supabase key is not configured.")

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "apikey": apikey,
                },
            )

        if response.status_code != 200:
            raise ValueError("Invalid or expired access token.")

        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Unexpected token verification response.")
        return data

    def list_open_loads(self) -> list[dict[str, Any]]:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.url}/rest/v1/loads",
                params={
                    "select": self._load_select_fields(),
                    "status": "eq.open",
                    "order": "match_score.desc.nullslast,created_at.desc",
                },
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not fetch open loads")
        data = response.json()
        return data if isinstance(data, list) else []

    def create_load(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                f"{self.url}/rest/v1/loads",
                json=payload,
                headers={
                    **self._service_headers(),
                    "Prefer": "return=representation",
                },
            )

        self._raise_for_error(response, "Could not create load")
        data = response.json()
        if not isinstance(data, list) or not data:
            raise ValueError("Supabase returned no created load.")
        first = data[0]
        if not isinstance(first, dict):
            raise ValueError("Unexpected create-load response format.")
        return first

    def get_vehicle_for_owner(
        self, vehicle_id: str, owner_id: str
    ) -> dict[str, Any] | None:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.url}/rest/v1/vehicles",
                params={
                    "select": "id,unit_id,owner_id,model",
                    "id": f"eq.{vehicle_id}",
                    "owner_id": f"eq.{owner_id}",
                    "limit": "1",
                },
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not fetch vehicle")
        data = response.json()
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                return first
        return None

    def assign_open_load(
        self, load_id: str, assignment_payload: dict[str, Any]
    ) -> dict[str, Any]:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.patch(
                f"{self.url}/rest/v1/loads",
                params={
                    "id": f"eq.{load_id}",
                    "status": "eq.open",
                    "select": self._load_select_fields(),
                },
                json=assignment_payload,
                headers={
                    **self._service_headers(),
                    "Prefer": "return=representation",
                },
            )

        self._raise_for_error(response, "Could not assign load")
        data = response.json()
        if not isinstance(data, list) or not data:
            raise ValueError("Load is no longer open or does not exist.")
        first = data[0]
        if not isinstance(first, dict):
            raise ValueError("Unexpected assign-load response format.")
        return first

    def get_load_by_id(self, load_id: str) -> dict[str, Any] | None:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.url}/rest/v1/loads",
                params={
                    "id": f"eq.{load_id}",
                    "select": self._load_select_fields(),
                    "limit": "1",
                },
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not fetch load")
        data = response.json()
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                return first
        return None

    def update_load(
        self,
        *,
        load_id: str,
        payload: dict[str, Any],
        expected_status: str | None = None,
    ) -> dict[str, Any] | None:
        self._ensure_configured()

        params: dict[str, str] = {
            "id": f"eq.{load_id}",
            "select": self._load_select_fields(),
        }
        if expected_status:
            params["status"] = f"eq.{expected_status}"

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.patch(
                f"{self.url}/rest/v1/loads",
                params=params,
                json=payload,
                headers={
                    **self._service_headers(),
                    "Prefer": "return=representation",
                },
            )

        self._raise_for_error(response, "Could not update load")
        data = response.json()
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                return first
        return None

    def create_assignment(self, payload: dict[str, Any]) -> None:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                f"{self.url}/rest/v1/assignments",
                json=payload,
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not persist assignment")

    def complete_active_assignment(self, load_id: str, carrier_id: str) -> None:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.patch(
                f"{self.url}/rest/v1/assignments",
                params={
                    "load_id": f"eq.{load_id}",
                    "carrier_id": f"eq.{carrier_id}",
                    "status": "eq.active",
                },
                json={"status": "completed"},
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not complete assignment")

    def set_vehicle_status(self, vehicle_id: str, status_value: str) -> None:
        self._ensure_configured()

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.patch(
                f"{self.url}/rest/v1/vehicles",
                params={"id": f"eq.{vehicle_id}"},
                json={"status": status_value},
                headers=self._service_headers(),
            )

        self._raise_for_error(response, "Could not update vehicle status")

    @staticmethod
    def _load_select_fields() -> str:
        return (
            "id,shipper_id,origin,destination,weight_kg,load_type,value,"
            "predicted_margin,empty_miles_saved,match_score,ai_reasoning,"
            "pickup_time,dropoff_time,length_cm,width_cm,height_cm,"
            "assigned_vehicle_id,assigned_vehicle_unit,assigned_carrier_id,"
            "assigned_carrier_name,assigned_at,status,created_at,shipment_code,"
            "cargo,net_margin,completed_at,route_origin,route_destination,"
            "pickup_confirmed_by_shipper_at,pickup_confirmed_by_carrier_at,"
            "delivered_confirmed_by_shipper_at,delivered_confirmed_by_carrier_at"
        )

    def _service_headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }

    def _ensure_configured(self) -> None:
        if not self.is_configured():
            raise ValueError("Supabase URL and service role key must be configured.")

    @staticmethod
    def _raise_for_error(response: httpx.Response, message: str) -> None:
        if response.is_success:
            return
        body = response.text.strip()
        if body:
            raise ValueError(f"{message}: {body}")
        raise ValueError(message)


supabase_client = SupabaseClient()
