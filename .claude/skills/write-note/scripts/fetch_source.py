"""Source 하나에서 읽을 수 있는 것을 긁어 JSON 하나로 내놓는다.

브리핑을 쓰려면 원문 전체가 필요하다. `WebFetch`는 작은 모델이 페이지를 읽고
질문에 답해 주는 도구라, 돌아오는 것은 원문이 아니라 그 모델의 요약이다.
요약의 요약을 재료로 쓰면 사람이 "여기가 걸린다"고 짚을 대목이 이미 깎여
나간 뒤다. 그래서 여기서는 자막과 본문을 글자 그대로 가져온다.

유튜브가 특히 그렇다. 자막 트랙은 페이지에 URL만 있고 그 URL을 그냥 부르면
빈 응답이 온다. `yt-dlp`가 그 절차를 알고 있어서 여기에 맡긴다. 설치돼 있지
않으면 `uvx`로 그 자리에서 부르므로 사전 설치를 요구하지 않는다.

읽지 못한 것은 `missing`에 남는다. 조용히 비워 두면 스킬이 자막을 읽은 줄
알고 브리핑을 쓰게 되므로, 못 읽었다는 사실 자체가 결과의 일부다.

사용법:
    python3 scripts/fetch_source.py <URL>            # JSON을 stdout으로
    python3 scripts/fetch_source.py <URL> --out DIR  # 자막·본문은 DIR에 파일로
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# 자막을 고르는 순서. 원어(`-orig`)를 앞에 두는 것은 번역된 자막이 한 번
# 기계를 거친 문장이라서다. 영상이 영어면 영어 원어 자막이 원문에 가장 가깝다.
SUBTITLE_PREFERENCE = ("en-orig", "en", "ko", "ko-orig")


def main() -> int:
    parser = argparse.ArgumentParser(description="Source에서 읽을 수 있는 것을 긁어 온다")
    parser.add_argument("url")
    parser.add_argument(
        "--out",
        help="자막·본문 전문을 파일로 남길 디렉터리. 없으면 JSON 안에만 담는다",
    )
    parser.add_argument(
        "--max-inline",
        type=int,
        default=200_000,
        help="JSON에 직접 담을 본문 길이 상한. 넘으면 --out 파일만 가리킨다",
    )
    args = parser.parse_args()

    kind = classify(args.url)
    if kind == "youtube":
        result = fetch_youtube(args.url)
    elif kind == "x":
        result = fetch_x(args.url)
    else:
        result = fetch_web(args.url)

    result["url"] = args.url
    result["kind"] = kind

    if args.out:
        write_long_fields(result, Path(args.out), args.max_inline)

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0 if result.get("ok") else 1


def classify(url: str) -> str:
    host = (urllib.parse.urlparse(url).hostname or "").lower().removeprefix("www.")
    if host in {"youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"}:
        return "youtube"
    if host in {"x.com", "twitter.com", "mobile.twitter.com", "nitter.net"}:
        return "x"
    return "web"


# --------------------------------------------------------------------------
# YouTube
# --------------------------------------------------------------------------


def fetch_youtube(url: str) -> dict:
    """메타데이터와 자막을 `yt-dlp`로 가져온다.

    메타데이터만 얻고 자막을 못 얻는 경우가 흔하다 (자막을 아예 안 단 영상,
    자동 자막이 꺼진 영상). 그때도 실패로 처리하지 않는 것은 설명란과 챕터만
    으로도 원문의 주장을 어느 정도 잡을 수 있어서다. 대신 `missing`에 남겨
    브리핑이 그 사실을 밝히게 한다.
    """
    result: dict = {"ok": False, "missing": [], "diagnostics": []}

    runner = ytdlp_runner()
    if runner is None:
        result["diagnostics"].append(
            "yt-dlp도 uvx도 없다. `brew install yt-dlp` 또는 `uv` 설치가 필요하다"
        )
        result["missing"] = ["메타데이터", "설명란", "챕터", "자막"]
        # yt-dlp가 없어도 제목·채널 정도는 oembed로 건진다.
        result.update(youtube_oembed(url))
        return result

    meta_proc = run([*runner, "-J", "--skip-download", "--no-warnings", url], timeout=120)
    if meta_proc is None or meta_proc.returncode != 0:
        result["diagnostics"].append("yt-dlp 메타데이터 조회 실패")
        result["missing"] = ["메타데이터", "설명란", "챕터", "자막"]
        result.update(youtube_oembed(url))
        return result

    try:
        info = json.loads(meta_proc.stdout)
    except json.JSONDecodeError:
        result["diagnostics"].append("yt-dlp가 JSON이 아닌 것을 내놨다")
        result["missing"] = ["메타데이터", "설명란", "챕터", "자막"]
        result.update(youtube_oembed(url))
        return result

    result["ok"] = True
    result["meta"] = {
        "title": info.get("title"),
        "author": info.get("uploader") or info.get("channel"),
        "channel_url": info.get("channel_url"),
        "duration_seconds": info.get("duration"),
        "duration_text": format_duration(info.get("duration")),
        "upload_date": format_date(info.get("upload_date")),
        "view_count": info.get("view_count"),
        "language": info.get("language"),
        # 글쓴이가 직접 타이핑한 태그다. 자동 자막이 틀린 고유명사를 여기서
        # 잡는 일이 잦다 — 자막의 `Raw`·`Klein`·`WinServe`가 태그에는
        # `ralph agent`·`cline agent`·`windsurf agent`로 적혀 있었다.
        "keywords": info.get("tags") or [],
    }
    result["description"] = info.get("description") or ""
    result["chapters"] = [
        {
            "start": chapter.get("start_time"),
            "start_text": format_duration(chapter.get("start_time")),
            "title": chapter.get("title"),
        }
        for chapter in (info.get("chapters") or [])
    ]
    if not result["chapters"]:
        # 챕터를 따로 안 넣고 설명란에 타임스탬프만 적는 채널이 많다.
        result["chapters"] = chapters_from_description(result["description"])

    transcript, track, kind = fetch_youtube_subtitles(runner, url, info)
    if transcript:
        result["transcript"] = transcript
        result["transcript_track"] = track
        result["transcript_kind"] = kind
        result["transcript_chars"] = len(transcript)
        if kind == "auto":
            # 자동 자막은 고유명사를 자주 틀린다. 인용하기 전에 알아야 한다.
            result["diagnostics"].append(
                "자동 자막이다. 사람 이름·제품 이름은 메타데이터와 설명란으로 대조할 것"
            )
    else:
        result["missing"].append("자막")
        result["diagnostics"].append("자막 트랙을 받지 못했다")

    if not result["description"]:
        result["missing"].append("설명란")
    if not result["chapters"]:
        result["missing"].append("챕터")

    # 댓글은 기본적으로 받지 않는다. `--write-comments`는 수백 개를 긁느라
    # 몇 분씩 걸리는데, 브리핑에 들어갈 값은 거의 없다.
    result["missing"].append("댓글(받지 않음)")

    return result


def fetch_youtube_subtitles(
    runner: list[str], url: str, info: dict
) -> tuple[str | None, str | None, str | None]:
    """수동 자막을 자동 자막보다 먼저 고른다.

    자동 자막은 문장 부호가 없고 고유명사를 자주 틀린다. 이 스크립트가 옮겨
    주는 것이 원문 그대로여야 하므로, 사람이 단 자막이 있으면 그쪽이다.

    어느 쪽에서 왔는지를 함께 돌려준다. 자동 자막을 그대로 인용하면 틀린
    인용이 되는데, 글자만 봐서는 자동인지 알 수 없기 때문이다.
    """
    manual = set(info.get("subtitles") or {})
    automatic = set(info.get("automatic_captions") or {})
    if not manual and not automatic:
        return None, None, None

    ordered = [code for code in SUBTITLE_PREFERENCE if code in manual]
    ordered += [code for code in sorted(manual) if code not in ordered]
    ordered += [code for code in SUBTITLE_PREFERENCE if code in automatic]
    ordered += [code for code in sorted(automatic) if code not in ordered and code in automatic]

    with tempfile.TemporaryDirectory() as tmp:
        proc = run(
            [
                *runner,
                "--skip-download",
                "--write-subs",
                "--write-auto-subs",
                "--sub-langs",
                "en.*,ko.*",
                "--sub-format",
                "vtt",
                "--no-warnings",
                "-o",
                str(Path(tmp) / "sub.%(ext)s"),
                url,
            ],
            timeout=180,
        )
        if proc is None:
            return None, None, None

        files = sorted(Path(tmp).glob("*.vtt"))
        if not files:
            return None, None, None

        chosen = pick_subtitle_file(files, ordered)
        text = vtt_to_text(chosen.read_text(encoding="utf-8", errors="replace"))
        return text, chosen.name, subtitle_kind(chosen.name, manual)


def subtitle_kind(filename: str, manual: set[str]) -> str:
    """파일명의 언어 코드가 수동 자막 목록에 있으면 사람이 단 것이다."""
    code = filename.removeprefix("sub.").removesuffix(".vtt")
    return "manual" if code in manual else "auto"


def pick_subtitle_file(files: list[Path], ordered: list[str]) -> Path:
    for code in ordered:
        for path in files:
            # 파일명은 `sub.en-orig.vtt` 꼴이다.
            if f".{code}." in path.name:
                return path
    return files[0]


def vtt_to_text(vtt: str) -> str:
    """VTT를 이어 붙인 평문으로 만든다.

    자동 자막은 같은 줄을 여러 번 되풀이해 내보낸다 (한 줄씩 밀어 올리는
    자막 연출을 그대로 적어 둔 탓이다). 바로 앞 줄과 같으면 버리는 것으로
    대부분 걸러진다.
    """
    lines: list[str] = []
    previous = None
    for raw in vtt.splitlines():
        line = raw.strip()
        if not line or "-->" in line:
            continue
        if line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE ")):
            continue
        if line.isdigit():
            continue
        text = re.sub(r"<[^>]+>", "", line).strip()
        if text and text != previous:
            lines.append(text)
            previous = text
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def chapters_from_description(description: str) -> list[dict]:
    chapters = []
    for line in description.splitlines():
        match = re.match(r"^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+[-–—]?\s*(.+)$", line)
        if match:
            chapters.append({"start_text": match.group(1), "title": match.group(2).strip()})
    return chapters


def youtube_oembed(url: str) -> dict:
    """yt-dlp가 없거나 실패했을 때 제목·채널만이라도 건진다."""
    endpoint = "https://www.youtube.com/oembed?" + urllib.parse.urlencode(
        {"url": url, "format": "json"}
    )
    body = http_get(endpoint)
    if body is None:
        return {}
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return {}
    return {
        "ok": True,
        "meta": {"title": data.get("title"), "author": data.get("author_name")},
    }


# --------------------------------------------------------------------------
# X
# --------------------------------------------------------------------------


def fetch_x(url: str) -> dict:
    """X는 로그인 없이 읽히지 않아 우회로를 순서대로 두드린다.

    `fxtwitter`를 먼저 보는 이유는 280자가 넘는 글의 전문을 주는 유일한
    경로여서다. X가 직접 주는 syndication 엔드포인트는 긴 글을 앞 280자에서
    자른 채 `note_tweet`에 id만 남기므로, 그것만 믿으면 잘린 앞부분을 전문으로
    알고 브리핑을 쓰게 된다. 실제로 이 스킬을 만들며 5배 차이가 났다.

    둘 다 실패하면 실패했다고 말한다 — 스레드의 뒷글을 추측으로 채우면
    원문에 없는 주장이 브리핑에 들어간다.
    """
    result: dict = {"ok": False, "missing": [], "diagnostics": []}

    match = re.search(r"/status/(\d+)", url)
    if not match:
        result["diagnostics"].append("글 ID를 URL에서 찾지 못했다")
        result["missing"] = ["본문"]
        return result

    tweet_id = match.group(1)

    if fetch_x_fxtwitter(tweet_id, result):
        return result

    result["diagnostics"].append("fxtwitter 실패. syndication으로 넘어간다")
    if fetch_x_syndication(tweet_id, result):
        return result

    result["diagnostics"].append(
        "두 경로 모두 실패했다. 브라우저 도구나 사람이 붙여 넣은 본문이 필요하다"
    )
    result["missing"] = ["본문", "스레드 뒷글"]
    return result


def fetch_x_fxtwitter(tweet_id: str, result: dict) -> bool:
    body = http_get(f"https://api.fxtwitter.com/status/{tweet_id}")
    if body is None:
        return False
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return False
    if data.get("code") != 200 or not isinstance(data.get("tweet"), dict):
        return False

    tweet = data["tweet"]
    author = tweet.get("author") or {}

    result["ok"] = True
    result["source_via"] = "fxtwitter"
    result["meta"] = {
        "title": None,
        "author": author.get("name"),
        "handle": author.get("screen_name"),
        "upload_date": epoch_to_date(tweet.get("created_timestamp")),
    }
    result["text"] = tweet.get("text") or ""

    # 인용된 글은 본문이 통째로 딸려 온다. 인용은 원문 주장의 일부라 붙여 둔다.
    quote = tweet.get("quote")
    if isinstance(quote, dict) and quote.get("text"):
        quote_author = (quote.get("author") or {}).get("name") or "?"
        result["quoted"] = {"author": quote_author, "text": quote["text"]}

    # `replying_to`가 있으면 이 글은 스레드 중간이다. 앞글을 안 읽고 답하면
    # 무엇에 대한 말인지 모르는 채로 판단하게 된다.
    if tweet.get("replying_to"):
        result["missing"].append(
            f"이 글 앞의 스레드(@{tweet['replying_to']}의 글에 이어 쓴 것이다)"
        )
    result["missing"].append("이 글 뒤로 이어지는 답글")
    return True


def fetch_x_syndication(tweet_id: str, result: dict) -> bool:
    endpoint = "https://cdn.syndication.twimg.com/tweet-result?" + urllib.parse.urlencode(
        {"id": tweet_id, "lang": "en", "token": syndication_token(tweet_id)}
    )
    body = http_get(endpoint)
    if body is None:
        return False
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return False

    result["ok"] = True
    result["source_via"] = "syndication"
    result["meta"] = {
        "title": None,
        "author": (data.get("user") or {}).get("name"),
        "handle": (data.get("user") or {}).get("screen_name"),
        "upload_date": (data.get("created_at") or "")[:10] or None,
    }
    result["text"] = data.get("text") or ""
    result["missing"].append("스레드 뒷글(엔드포인트가 글 하나만 준다)")

    # 280자를 넘긴 글은 `note_tweet`에 전문이 있고 `text`에는 앞부분만 온다.
    # 이 엔드포인트는 `note_tweet`의 id만 주고 본문은 주지 않는다.
    if data.get("note_tweet"):
        result["truncated"] = True
        result["missing"].append("본문 뒷부분(280자가 넘는 글이라 앞부분만 왔다)")

    if data.get("quoted_tweet"):
        result["missing"].append("인용된 글의 본문")

    return True


def syndication_token(tweet_id: str) -> str:
    """syndication이 요구하는 토큰. 글 id에서 곧장 계산된다."""
    value = (int(tweet_id) / 1e15) * (3.141592 % 1)
    return format(value, ".15f").rstrip("0").split(".")[1][:11] or "0"


# --------------------------------------------------------------------------
# 블로그 · 기사
# --------------------------------------------------------------------------


def fetch_web(url: str) -> dict:
    """본문만 뽑아낸다. `trafilatura`가 있으면 그쪽이 훨씬 깨끗하다."""
    result: dict = {"ok": False, "missing": [], "diagnostics": []}

    html = http_get(url)
    if html is None:
        result["diagnostics"].append("페이지를 받지 못했다 (로그인·차단·404)")
        result["missing"] = ["본문"]
        return result

    text = extract_with_trafilatura(url)
    if text is None:
        text = strip_html(html)
        result["diagnostics"].append("trafilatura 없이 태그만 걷어냈다. 잡음이 섞일 수 있다")

    result["ok"] = bool(text.strip())
    result["meta"] = {
        "title": first_match(html, r"<title[^>]*>(.*?)</title>")
        or meta_content(html, "og:title"),
        "author": meta_content(html, "author") or meta_content(html, "article:author"),
        "site": meta_content(html, "og:site_name")
        or (urllib.parse.urlparse(url).hostname or "").removeprefix("www."),
        "upload_date": meta_content(html, "article:published_time"),
    }
    result["description"] = meta_content(html, "og:description") or ""
    result["text"] = text
    result["text_chars"] = len(text)
    if not text.strip():
        result["missing"].append("본문")
    return result


def extract_with_trafilatura(url: str) -> str | None:
    runner = tool_runner("trafilatura")
    if runner is None:
        return None
    proc = run([*runner, "-u", url], timeout=120)
    if proc is None or proc.returncode != 0 or not proc.stdout.strip():
        return None
    return proc.stdout.strip()


def strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", " ", html)
    body = re.search(r"(?is)<(article|main)[^>]*>(.*?)</\1>", html)
    chunk = body.group(2) if body else html
    chunk = re.sub(r"(?i)<br\s*/?>", "\n", chunk)
    chunk = re.sub(r"(?i)</(p|div|li|h[1-6])>", "\n\n", chunk)
    text = re.sub(r"<[^>]+>", " ", chunk)
    text = unescape_entities(text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def unescape_entities(text: str) -> str:
    import html as html_module

    return html_module.unescape(text)


def meta_content(html: str, name: str) -> str | None:
    for pattern in (
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(name)}["\'][^>]+content=["\'](.*?)["\']',
        rf'<meta[^>]+content=["\'](.*?)["\'][^>]+(?:property|name)=["\']{re.escape(name)}["\']',
    ):
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            return unescape_entities(match.group(1)).strip()
    return None


def first_match(html: str, pattern: str) -> str | None:
    match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
    return unescape_entities(match.group(1)).strip() if match else None


# --------------------------------------------------------------------------
# 공통
# --------------------------------------------------------------------------


def ytdlp_runner() -> list[str] | None:
    return tool_runner("yt-dlp")


def tool_runner(tool: str) -> list[str] | None:
    """설치돼 있으면 그것을, 없으면 `uvx`로 그 자리에서 부른다."""
    found = shutil.which(tool)
    if found:
        return [found]
    uvx = shutil.which("uvx")
    if uvx:
        return [uvx, tool]
    return None


def run(command: list[str], timeout: int) -> subprocess.CompletedProcess | None:
    try:
        return subprocess.run(
            command, capture_output=True, text=True, timeout=timeout, check=False
        )
    except (subprocess.TimeoutExpired, OSError):
        return None


def http_get(url: str) -> str | None:
    request = urllib.request.Request(
        url, headers={"User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9"}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, ValueError):
        return None


def format_duration(seconds) -> str | None:
    if not isinstance(seconds, (int, float)):
        return None
    total = int(seconds)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def format_date(compact) -> str | None:
    if isinstance(compact, str) and len(compact) == 8 and compact.isdigit():
        return f"{compact[:4]}-{compact[4:6]}-{compact[6:]}"
    return None


def epoch_to_date(seconds) -> str | None:
    if not isinstance(seconds, (int, float)):
        return None
    from datetime import datetime, timezone

    return datetime.fromtimestamp(seconds, tz=timezone.utc).strftime("%Y-%m-%d")


def write_long_fields(result: dict, directory: Path, max_inline: int) -> None:
    """긴 것은 파일로 뺀다. 자막 하나가 수만 자라 JSON에 그대로 두면 읽기 나쁘다."""
    directory.mkdir(parents=True, exist_ok=True)
    for field, filename in (("transcript", "transcript.txt"), ("text", "text.txt")):
        value = result.get(field)
        if not isinstance(value, str) or not value:
            continue
        path = directory / filename
        path.write_text(value, encoding="utf-8")
        result[f"{field}_path"] = str(path)
        if len(value) > max_inline:
            result[field] = value[:max_inline]
            result[f"{field}_truncated"] = True


if __name__ == "__main__":
    raise SystemExit(main())
