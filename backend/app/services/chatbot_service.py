from app.services.llm_subcategory_generator import (
    _get_groq_client,
    _groq_models_to_try,
)

MAX_PAPER_CHARS = 16000

SYSTEM_PROMPT = """
You are a research paper assistant.

Answer questions using the supplied research paper as your primary source.

Rules:
- Base your answers on the paper.
- If the paper does not contain enough information to answer, say so.
- Do not invent findings, methods, results, or citations.
- Explain technical ideas clearly.
- When appropriate, mention which part of the paper supports your answer.
- Respond using plain text only.
- Do not use Markdown formatting, tables, headings, bold text, asterisks, hashtags, or other formatting symbols.
- Keep answers clear and conversational.
- Keep responses concise.
- Prefer 2 to 4 short paragraphs.
- Do not exceed roughly 300 words unless the user explicitly asks for more detail.
""".strip()


def chat_with_paper(
    paper_content: str,
    user_message: str,
    history: list[dict] | None = None,
) -> str:
    client = _get_groq_client()

    paper_content = paper_content[:MAX_PAPER_CHARS]

    messages = [
        {
            "role": "system",
            "content": (
                f"{SYSTEM_PROMPT}\n\n"
                f"RESEARCH PAPER:\n\n{paper_content}"
            ),
        }
    ]

    if history:
        messages.extend(history)

    messages.append(
        {
            "role": "user",
            "content": user_message,
        }
    )

    last_error = None

    for model_name in _groq_models_to_try():
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )

            return response.choices[0].message.content.strip()

        except Exception as error:
            last_error = error

    raise last_error or RuntimeError("No Groq models configured.")
