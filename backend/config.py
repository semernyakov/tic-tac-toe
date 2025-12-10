import os

# Попытаться загрузить .env, если python-dotenv установлен
try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    # Если python-dotenv не установлен, продолжим — переменные окружения могут быть заданы по-другому
    pass

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")