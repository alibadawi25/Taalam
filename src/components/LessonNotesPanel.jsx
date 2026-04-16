import {
  NotePencil,
  SignIn,
  Star,
  Trash,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import "./LessonNotesPanel.css";

function LessonNotesPanel({
  isAuthenticated,
  currentTimestamp,
  draft,
  saveError,
  isLoading,
  isSaving,
  notes,
  onDraftChange,
  onCreateNote,
  onJumpToNote,
  onToggleStar,
  onDeleteNote,
  formatTime,
}) {
  return (
    <section className="lesson-notes" aria-labelledby="lesson-notes-title">
      <div className="lesson-notes-header">
        <div>
          <p className="lesson-notes-kicker">ملاحظاتك الشخصية</p>
          <h2 className="lesson-notes-title" id="lesson-notes-title">
            دوّن الفوائد أثناء المشاهدة
          </h2>
        </div>
        <span className="lesson-notes-timestamp">{formatTime(currentTimestamp)}</span>
      </div>

      {!isAuthenticated ? (
        <div className="lesson-notes-auth">
          <p className="lesson-notes-auth-title">سجّل دخولك لحفظ الملاحظات</p>
          <p className="lesson-notes-auth-copy">
            ستظهر ملاحظاتك لكل درس مع التوقيت، ويمكنك الرجوع لها لاحقًا من نفس الحساب.
          </p>
          <Link to="/auth" className="lesson-notes-auth-link">
            <SignIn weight="duotone" aria-hidden="true" />
            تسجيل الدخول
          </Link>
        </div>
      ) : (
        <>
          <form
            className="lesson-notes-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateNote?.();
            }}
          >
            <label className="lesson-notes-field">
              <span>أضف ملاحظة عند {formatTime(currentTimestamp)}</span>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange?.(event.target.value)}
                placeholder="اكتب فكرة، فائدة، أو سؤال تريد الرجوع له لاحقًا..."
                rows="4"
              />
            </label>

            {saveError ? <p className="lesson-notes-error">{saveError}</p> : null}

            <div className="lesson-notes-actions">
              <button
                type="submit"
                className="lesson-notes-submit"
                disabled={isSaving || !draft.trim()}
              >
                <NotePencil weight="duotone" aria-hidden="true" />
                {isSaving ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
              </button>
            </div>
          </form>

          <div className="lesson-notes-list-wrap">
            {isLoading ? (
              <p className="lesson-notes-empty">جارٍ تحميل الملاحظات...</p>
            ) : notes.length === 0 ? (
              <p className="lesson-notes-empty">
                لا توجد ملاحظات بعد. أضف أول ملاحظة أثناء المشاهدة.
              </p>
            ) : (
              <ul className="lesson-notes-list">
                {notes.map((note) => (
                  <li key={note.id} className="lesson-notes-item">
                    <button
                      type="button"
                      className="lesson-notes-jump"
                      onClick={() => onJumpToNote?.(note.timestampSeconds)}
                    >
                      {formatTime(note.timestampSeconds)}
                    </button>

                    <div className="lesson-notes-body">
                      <p className="lesson-notes-content">{note.content}</p>
                      <div className="lesson-notes-item-actions">
                        <button
                          type="button"
                          className={`lesson-notes-icon ${note.isStarred ? "is-active" : ""}`}
                          onClick={() => onToggleStar?.(note)}
                          aria-label={note.isStarred ? "إلغاء تمييز الملاحظة" : "تمييز الملاحظة"}
                        >
                          <Star
                            weight={note.isStarred ? "fill" : "duotone"}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          className="lesson-notes-icon"
                          onClick={() => onDeleteNote?.(note)}
                          aria-label="حذف الملاحظة"
                        >
                          <Trash weight="duotone" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default LessonNotesPanel;
