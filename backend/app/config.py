from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    public_data_service_key: str = Field(default="", alias="PUBLIC_DATA_SERVICE_KEY")
    public_data_key_mode: str = Field(default="decoding", alias="PUBLIC_DATA_KEY_MODE")

    dur_prdlst_info_base_url: str = Field(
        default="https://apis.data.go.kr/1471000/DURPrdlstInfoService03",
        alias="DUR_PRDLST_INFO_BASE_URL",
    )
    easy_drug_info_base_url: str = Field(
        default="https://apis.data.go.kr/1471000/DrbEasyDrugInfoService",
        alias="EASY_DRUG_INFO_BASE_URL",
    )
    drug_prdt_prmsn_info_base_url: str = Field(
        default="https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07",
        alias="DRUG_PRDT_PRMSN_INFO_BASE_URL",
    )
    htfs_info_base_url: str = Field(
        default="https://apis.data.go.kr/1471000/HtfsInfoService03",
        alias="HTFS_INFO_BASE_URL",
    )
    pill_id_info_base_url: str = Field(
        default="https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03",
        alias="PILL_ID_INFO_BASE_URL",
    )
    foodsafety_api_key: str = Field(default="", alias="FOODSAFETY_API_KEY")
    foodsafety_base_url: str = Field(
        default="http://openapi.foodsafetykorea.go.kr/api",
        alias="FOODSAFETY_BASE_URL",
    )
    foodsafety_supplement_ingredient_service_id: str = Field(
        default="I0760",
        alias="FOODSAFETY_SUPPLEMENT_INGREDIENT_SERVICE_ID",
    )
    tmap_app_key: str = Field(default="", alias="TMAP_APP_KEY")
    kakao_rest_api_key: str = Field(default="", alias="KAKAO_REST_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
