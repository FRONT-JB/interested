import { NoteCard } from "@/components/note-card";
import { feedNotes } from "@/lib/repository";

export default async function Home() {
  const notes = await feedNotes();

  return (
    <div className="space-y-2">
      <header className="space-y-1 pb-4">
        <h1 className="text-sm font-semibold tracking-tight">Notes</h1>
        <p className="text-xs text-muted-foreground">
          {notes.length === 0 ? "아직 한 편도 없다" : `${notes.length}편 · 최근에 쓴 것이 위에 있다`}
        </p>
      </header>

      {notes.length === 0 ? (
        <p className="border-t border-border py-10 text-sm text-muted-foreground">
          Source 하나를 읽고 Note를 한 편 쓰면 여기에 놓인다.
        </p>
      ) : (
        <div className="border-t border-border">
          {notes.map((note) => (
            <NoteCard key={note.slug} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
