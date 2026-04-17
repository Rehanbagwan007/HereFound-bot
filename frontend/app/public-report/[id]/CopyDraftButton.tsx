'use client';

interface CopyDraftButtonProps {
  draft: string;
}

export function CopyDraftButton({ draft }: CopyDraftButtonProps) {
  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft);
    window.alert('Copied to clipboard');
  };

  return (
    <button
      type="button"
      className="mt-4 rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-500"
      onClick={copyDraft}
    >
      Copy to Clipboard
    </button>
  );
}
