"""
Application configuration settings.
Loads environment variables and provides centralized config access.
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ALLOWED_ORIGINS: str = "http://localhost:3008,http://127.0.0.1:3008,http://localhost:3000,http://127.0.0.1:3000"
    HOST: str = "0.0.0.0"
    PORT: int = 8008

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-northeast-2"
    S3_BUCKET_NAME: str = "furniture-platform-eunryong"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# 향후 다른 DB 연결 시 여기서 분기 처리:
# if DB_TYPE == "postgresql":
#     DATABASE_URL = f"postgresql://{USER}:{PASS}@{HOST}:{PORT}/{DB}"
# elif DB_TYPE == "mysql":
#     DATABASE_URL = f"mysql+pymysql://{USER}:{PASS}@{HOST}:{PORT}/{DB}"

settings = Settings()
