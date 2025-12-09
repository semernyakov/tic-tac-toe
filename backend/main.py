# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import random
from typing import Optional

app = FastAPI(title="Tic-Tac-Toe API")

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация Telegram
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"  # Замените на токен вашего бота
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID_HERE"  # Замените на ваш chat_id


class GameResult(BaseModel):
    result: str  # "win", "lose", "draw"
    promo_code: Optional[str] = None


def generate_promo_code() -> str:
    """Генерирует 5-значный промокод"""
    return str(random.randint(10000, 99999))


async def send_telegram_message(message: str) -> bool:
    """Отправляет сообщение в Telegram бот"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            return response.status_code == 200
    except Exception as e:
        print(f"Error sending Telegram message: {e}")
        return False


@app.get("/")
async def root():
    return {"message": "Tic-Tac-Toe API is running"}


@app.post("/api/game-result")
async def handle_game_result(result: GameResult):
    """Обрабатывает результат игры и отправляет уведомление в Telegram"""

    if result.result == "win":
        promo_code = result.promo_code or generate_promo_code()
        message = f"🎉 <b>Победа!</b>\nПромокод выдан: <code>{promo_code}</code>"

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)