import { Feed } from "@/components/feed";
import { feedNotes } from "@/lib/repository";

export default async function Home() {
  const notes = await feedNotes();

  if (notes.length === 0) {
    return (
      <div className="max-w-[52ch] space-y-4">
        <h1 className="font-heading text-[1.6rem] leading-9 font-medium tracking-tight">
          아직 아무것도 읽지 않았습니다
        </h1>

        {/* 빈 화면은 "없다"가 아니라 여기가 무엇으로 채워지는 자리인지를 말한다. */}
        <p className="text-muted-foreground text-[14.5px] leading-7">
          URL 하나로 가리킬 수 있는 글이나 영상을 하나 읽고 Note를 한 편 쓰면 이 자리에 놓입니다.
          Note가 세 편 쌓이면 관찰자가 관심의 이름을 부르기 시작합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex items-baseline gap-3">
        <h1 className="text-muted-foreground font-mono text-[10.5px] tracking-[0.18em] uppercase">
          Notes
        </h1>

        <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-wide">
          {notes.length}
        </span>
      </header>

      <Feed
        notes={notes.map(({ slug, date, title, take, concepts }) => ({
          slug,
          date,
          title,
          take,
          concepts,
        }))}
      />
    </div>
  );
}
