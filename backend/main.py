# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import random
from typing import Optional
import os
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

app = FastAPI(title="Tic-Tac-Toe API")

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Получаем конфигурацию
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Отладочная информация
print("=" * 50)
print("🚀 ЗАПУСК СЕРВЕРА")
print(f"Бот токен: {'✅' if TELEGRAM_BOT_TOKEN else '❌'} {'Есть' if TELEGRAM_BOT_TOKEN else 'Нет'}")
print(f"Chat ID: {'✅' if TELEGRAM_CHAT_ID else '❌'} {TELEGRAM_CHAT_ID}")
print("=" * 50)

# Преобразуем chat_id в int если он строка
if TELEGRAM_CHAT_ID:
    try:
        TELEGRAM_CHAT_ID = int(TELEGRAM_CHAT_ID)
        print(f"Chat ID преобразован в int: {TELEGRAM_CHAT_ID}")
    except ValueError as e:
        print(f"❌ Ошибка преобразования chat_id: {e}")
        TELEGRAM_CHAT_ID = None
else:
    print("⚠️ Предупреждение: TELEGRAM_CHAT_ID не установлен")


class GameResult(BaseModel):
    result: str  # "win", "lose", "draw"
    promo_code: Optional[str] = None


def generate_promo_code() -> str:
    """Генерирует 5-значный промокод"""
    return str(random.randint(10000, 99999))


async def send_telegram_message(message: str) -> bool:
    """Отправляет сообщение в Telegram бот"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"❌ Не хватает конфигурации: токен={bool(TELEGRAM_BOT_TOKEN)}, chat_id={TELEGRAM_CHAT_ID}")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    print(f"\n📤 Отправка в Telegram:")
    print(f"   Chat ID: {TELEGRAM_CHAT_ID}")
    print(f"   Сообщение: {message[:100]}...")

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            print(f"   📨 Ответ Telegram API: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    print(f"   ✅ Успешно отправлено! Message ID: {data['result'].get('message_id')}")
                    return True
                else:
                    print(f"   ❌ Telegram API ошибка: {data}")
                    return False
            else:
                print(f"   ❌ HTTP ошибка: {response.status_code}")
                print(f"   Текст ответа: {response.text[:200]}")
                return False

    except httpx.TimeoutException:
        print("   ⏰ Таймаут при отправке в Telegram")
        return False
    except Exception as e:
        print(f"   ❌ Неожиданная ошибка: {e}")
        import traceback
        print(f"   Трейсбэк: {traceback.format_exc()}")
        return False


@app.get("/")
async def root():
    return {"message": "Tic-Tac-Toe API is running"}


@app.post("/api/game-result")
async def handle_game_result(result: GameResult):
    """Обрабатывает результат игры и отправляет уведомление в Telegram"""

    print(f"\n🎮 Получен результат игры: {result.result}")

    if result.result == "win":
        promo_code = result.promo_code or generate_promo_code()
        message = f"🎉 <b>Победа!</b>\nПромокод выдан: <code>{promo_code}</code>"

        print(f"   Промокод: {promo_code}")
        success = await send_telegram_message(message)

        return {
            "status": "success",
            "promo_code": promo_code,
            "telegram_sent": success
        }

    elif result.result == "lose":
        message = "😔 <b>Проигрыш</b>"
        success = await send_telegram_message(message)

        return {
            "status": "success",
            "telegram_sent": success
        }

    elif result.result == "draw":
        message = "🤝 <b>Ничья</b>"
        success = await send_telegram_message(message)

        return {
            "status": "success",
            "telegram_sent": success
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid game result")


@app.get("/api/health")
async def health_check():
    """Проверка работоспособности API"""
    return {"status": "healthy"}


@app.get("/api/debug")
async def debug_info():
    """Отладочная информация"""
    return {
        "telegram_bot_token_set": bool(TELEGRAM_BOT_TOKEN),
        "telegram_chat_id": TELEGRAM_CHAT_ID,
        "telegram_chat_id_type": type(TELEGRAM_CHAT_ID).__name__,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
