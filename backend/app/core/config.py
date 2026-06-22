from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union

class Settings(BaseSettings):
    GROQ_API_KEY: str
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 200
    
    # 1. Map the .env variable "ALLOWED_ORIGINS" to this field
    ALLOWED_ORIGINS: Union[str, List[str]]

    # 2. Add a property computed on-the-fly to satisfy app.main's requirement
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            # Split by comma if you ever want to add more origins later, e.g., "url1,url2"
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings() # type: ignore